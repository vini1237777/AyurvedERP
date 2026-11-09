import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../utils/secrets";



export type Role = "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as unknown as {
      sub: number;
      email: string;
      role: string;
    };
    (req as any).userId = payload.sub;
    (req as any).userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

const WRITE_ELIGIBLE: Role[] = ["SELLER", "ACCOUNTANT", "RETAILER"];

export function readOnlyForRoles(...readOnlyRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole as Role | undefined;
    if (!role) return res.status(401).json({ error: "Unauthorized" });
    if (role === "ADMIN") return next();
    const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    // Deny by default, so a role this list has never heard of cannot write.
    if (isWrite && (!WRITE_ELIGIBLE.includes(role) || readOnlyRoles.includes(role)))
      return res
        .status(403)
        .json({ error: `Read-only — ${role} cannot modify this resource` });
    next();
  };
}
