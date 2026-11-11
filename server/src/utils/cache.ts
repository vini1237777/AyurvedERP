import Redis from "ioredis";

let client: Redis | null = null;
let warned = false;

function getClient(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 500,
      retryStrategy: () => null,
    });
    client.on("error", (e: NodeJS.ErrnoException) => {
      if (!warned) {
        console.warn(
          `[cache] Redis unreachable at ${url} (${e.code || e.message}). Falling back to no-cache.`,
        );
        warned = true;
      }
    });
    return client;
  } catch {
    return null;
  }
}

function isReady(c: Redis | null): c is Redis {
  return !!c && (c.status === "ready" || c.status === "connect");
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const c = getClient();
    if (!isReady(c)) return null;
    try {
      const raw = await c.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const c = getClient();
    if (!isReady(c)) return;
    try {
      await c.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      /* no-op */
    }
  },

  async del(key: string): Promise<void> {
    const c = getClient();
    if (!isReady(c)) return;
    try {
      await c.del(key);
    } catch {
      /* no-op */
    }
  },

  async delPattern(pattern: string): Promise<void> {
    const c = getClient();
    if (!isReady(c)) return;
    try {
      const stream = c.scanStream({ match: pattern, count: 100 });
      const pipeline = c.pipeline();
      for await (const keys of stream) {
        for (const k of keys as string[]) pipeline.del(k);
      }
      await pipeline.exec();
    } catch {
      /* no-op */
    }
  },

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    computeFn: () => Promise<T>,
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const fresh = await computeFn();
    void this.set(key, fresh, ttlSeconds);
    return fresh;
  },

  // Adds 1 to a counter that expires ttlSeconds after its first hit. Returns
  // null when Redis is unavailable, so the caller can fall back.
  async incrWindow(
    key: string,
    ttlSeconds: number,
  ): Promise<{ count: number; ttl: number } | null> {
    const c = getClient();
    if (!isReady(c)) return null;
    try {
      const out = await c.multi().incr(key).ttl(key).exec();
      const count = Number(out?.[0]?.[1]);
      let ttl = Number(out?.[1]?.[1]);
      if (ttl < 0) {
        await c.expire(key, ttlSeconds);
        ttl = ttlSeconds;
      }
      return { count, ttl };
    } catch {
      return null;
    }
  },

  // Reads a counter without changing it.
  async peekWindow(key: string): Promise<{ count: number; ttl: number } | null> {
    const c = getClient();
    if (!isReady(c)) return null;
    try {
      const out = await c.multi().get(key).ttl(key).exec();
      return { count: Number(out?.[0]?.[1]) || 0, ttl: Number(out?.[1]?.[1]) };
    } catch {
      return null;
    }
  },

  isHealthy(): boolean {
    return isReady(client);
  },
};
