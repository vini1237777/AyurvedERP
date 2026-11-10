import type { Request, Response } from "express";

// An error whose message is written for the user. Any other error is logged on
// the server and the client only sees a generic message with the request id.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function sendError(req: Request, res: Response, err: unknown) {
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  console.error(`[${req.id}] ${req.method} ${req.originalUrl}`, err);
  return res
    .status(500)
    .json({ error: "Something went wrong. Please try again.", requestId: req.id });
}
