import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

const LEGACY_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || LEGACY_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || LEGACY_SECRET + "_refresh";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

type SafeUser = { id: number; email: string; name: string; role: string };

function signAccessToken(user: SafeUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: "access" },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

function signRefreshToken(userId: number) {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
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
    const refreshToken = signRefreshToken(user.id);

    res.json({
      accessToken,
      refreshToken,
      token: accessToken,
      user: safe,
    });
  } catch (err: any) {
    console.error("[auth:login]", err);
    res.status(500).json({ error: "Login failed" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token required" });

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }
    if (payload?.type !== "refresh")
      return res.status(401).json({ error: "Invalid token type" });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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
    const accessToken = signAccessToken(safe);
    res.json({ accessToken, token: accessToken, user: safe });
  } catch (err: any) {
    console.error("[auth:refresh]", err);
    res.status(500).json({ error: "Refresh failed" });
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
