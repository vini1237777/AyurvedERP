import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Gives every request an id that is sent back in X-Request-Id and written in
// server logs, so a user's error can be matched to its log line.
export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}
