import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

import { JWT_ACCESS_SECRET } from "../utils/secrets";
import {
  issueRefreshToken,
  revokeByToken,
  rotateRefreshToken,
  SessionError,
} from "../services/refreshTokens";

const ACCESS_TOKEN_TTL = "15m";

// The refresh token lives only in this cookie. httpOnly keeps it away from
// page scripts, SameSite=Strict keeps other sites from sending it, and the
// path limits it to the auth routes.
export const REFRESH_COOKIE = "aushadhi_rt";
const refreshCookie = {
  httpOnly: true,
  // COOKIE_SECURE=false for a production build served over plain http,
  // such as docker compose on localhost.
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production" || !!process.env.VERCEL,
  sameSite: "strict" as const,
  path: "/api/auth",
};
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    ...refreshCookie,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

const readRefreshCookie = (req: Request): string | undefined => {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value ? value : undefined;
};

type SafeUser = { id: number; email: string; name: string; role: string };

function signAccessToken(user: SafeUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: "access" },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const safe: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = signAccessToken(safe);
    setRefreshCookie(res, await issueRefreshToken(user.id));
    res.json({ accessToken, user: safe });
  } catch (err: any) {
    console.error("[auth:login]", err);
    res.status(500).json({ error: "Login failed" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = readRefreshCookie(req);
    if (!refreshToken)
      return res.status(401).json({ error: "Not signed in" });

    const rotated = await rotateRefreshToken(refreshToken);
    setRefreshCookie(res, rotated.token);
    const user = await prisma.user.findUnique({
      where: { id: rotated.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ error: "User no longer valid" });

    const safe: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    res.json({ accessToken: signAccessToken(safe), user: safe });
  } catch (err: any) {
    if (err instanceof SessionError) {
      if (err.status === 401) res.clearCookie(REFRESH_COOKIE, refreshCookie);
      return res.status(err.status).json({ error: err.message });
    }
    console.error("[auth:refresh]", err);
    res.status(500).json({ error: "Refresh failed" });
  }
};

// Ends the session the refresh token belongs to. It needs no access token,
// so signing out works even after the access token has expired.
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = readRefreshCookie(req);
    if (refreshToken) await revokeByToken(refreshToken);
    res.clearCookie(REFRESH_COOKIE, refreshCookie);
    res.status(204).end();
  } catch (err: any) {
    console.error("[auth:logout]", err);
    res.status(500).json({ error: "Logout failed" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ error: "Unauthorized" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
