import "dotenv/config";

type Env = Record<string, string | undefined>;

const DEV_SECRET = "dev-secret-change-me";

// A public fallback would let anyone sign an admin token, so production
// refuses to start without a real secret.
export function resolveJwtSecrets(env: Env) {
  const access = env.JWT_ACCESS_SECRET || env.JWT_SECRET;
  if (!access && env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET must be set in production");
  }
  return { accessSecret: access || DEV_SECRET };
}

const secrets = resolveJwtSecrets(process.env);

export const JWT_ACCESS_SECRET = secrets.accessSecret;
