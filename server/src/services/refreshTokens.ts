import { createHash, randomBytes, randomUUID } from "node:crypto";
import prisma from "../utils/prisma";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Two tabs can send the same token at once. The one that loses gets a 409
// within this window and retries with the token the other tab received,
// instead of being treated as a stolen token.
export const ROTATION_GRACE_MS = 30 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// A refresh problem the client should see, with its HTTP status.
export class SessionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const raceError = () =>
  new SessionError(409, "This session was just refreshed. Please retry.");

// Starts a new family. The raw token goes to the client; only its hash is kept.
export async function issueRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date(now) } },
    }),
    prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId,
        familyId: randomUUID(),
        tokenHash: hash(token),
        expiresAt: new Date(now + TOKEN_TTL_MS),
      },
    }),
  ]);
  return token;
}

// Swaps a valid token for a new one in the same family. A token that was
// already swapped, outside the grace window, ends the whole family.
export async function rotateRefreshToken(
  token: string,
): Promise<{ userId: number; token: string }> {
  const now = new Date();
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash(token) },
  });
  if (!row || row.expiresAt <= now)
    throw new SessionError(401, "Invalid or expired refresh token");

  if (row.revokedAt) {
    const justRotated =
      row.replacedById &&
      now.getTime() - row.revokedAt.getTime() < ROTATION_GRACE_MS;
    if (justRotated) throw raceError();
    await revokeFamily(row.familyId);
    throw new SessionError(401, "Session ended. Please sign in again.");
  }

  const next = randomBytes(32).toString("base64url");
  const nextId = randomUUID();
  await prisma.$transaction(async (tx) => {
    // Only one request can revoke the row: the update re-checks revokedAt
    // under the row lock, so a concurrent refresh updates 0 rows.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: now, replacedById: nextId },
    });
    if (count === 0) throw raceError();
    await tx.refreshToken.create({
      data: {
        id: nextId,
        userId: row.userId,
        familyId: row.familyId,
        tokenHash: hash(next),
        expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      },
    });
  });
  return { userId: row.userId, token: next };
}

export async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Ends the session the token belongs to. Unknown tokens are ignored.
export async function revokeByToken(token: string) {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash(token) },
    select: { familyId: true },
  });
  if (row) await revokeFamily(row.familyId);
}
