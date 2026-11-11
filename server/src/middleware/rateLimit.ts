import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { cache } from "../utils/cache";

const WINDOW_SECONDS = 15 * 60;
// The login load test raises this, since all its users share one address.
const MAX_ATTEMPTS_PER_IP = Number(process.env.LOGIN_LIMIT_PER_IP) || 100;
const MAX_FAILURES_PER_ACCOUNT = 10;

type Window = { count: number; ttl: number };

// Used only while Redis is down. Each server process keeps its own counts.
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryWindow(key: string, add: number): Window {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    if (memory.size > 10_000)
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    entry = { count: 0, resetAt: now + WINDOW_SECONDS * 1000 };
    if (add) memory.set(key, entry);
  }
  entry.count += add;
  return { count: entry.count, ttl: Math.ceil((entry.resetAt - now) / 1000) };
}

async function bump(key: string): Promise<Window> {
  return (await cache.incrWindow(key, WINDOW_SECONDS)) ?? memoryWindow(key, 1);
}

async function peek(key: string): Promise<Window> {
  return (await cache.peekWindow(key)) ?? memoryWindow(key, 0);
}

function tooMany(res: Response, ttl: number) {
  const seconds = Math.max(ttl, 1);
  const minutes = Math.ceil(seconds / 60);
  res.setHeader("Retry-After", String(seconds));
  return res.status(429).json({
    error: `Too many sign in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  });
}

// The email is hashed so Redis never holds it.
const accountKey = (ip: string, email: unknown) =>
  `rl:login:fail:${ip}:${createHash("sha256")
    .update(String(email ?? "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 32)}`;

// Two limits on sign in: every attempt from one address, and failed attempts
// for one account from one address. Successful sign ins don't count towards
// the second, so people using the shared demo accounts aren't locked out.
export async function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ip = req.ip || "unknown";
  const perIp = await bump(`rl:login:ip:${ip}`);
  if (perIp.count > MAX_ATTEMPTS_PER_IP) return tooMany(res, perIp.ttl);

  const failKey = accountKey(ip, req.body?.email);
  const failures = await peek(failKey);
  if (failures.count >= MAX_FAILURES_PER_ACCOUNT)
    return tooMany(res, failures.ttl);

  res.on("finish", () => {
    if (res.statusCode === 401) void bump(failKey);
  });
  next();
}

export const loginLimits = {
  windowSeconds: WINDOW_SECONDS,
  perIp: MAX_ATTEMPTS_PER_IP,
  failuresPerAccount: MAX_FAILURES_PER_ACCOUNT,
};
