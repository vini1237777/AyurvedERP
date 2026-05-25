import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  "dev-secret-change-me";

export type Role = "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as {
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

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole as Role | undefined;
    if (!role) return res.status(401).json({ error: "Unauthorized" });
    if (role === "ADMIN") return next();
    if (!allowed.includes(role))
      return res
        .status(403)
        .json({ error: `Forbidden — role ${role} not permitted` });
    next();
  };
}

export function readOnlyForRoles(...readOnlyRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).userRole as Role | undefined;
    if (!role) return res.status(401).json({ error: "Unauthorized" });
    if (role === "ADMIN") return next();
    const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    if (isWrite && readOnlyRoles.includes(role))
      return res
        .status(403)
        .json({ error: `Read-only — ${role} cannot modify this resource` });
    next();
  };
}
