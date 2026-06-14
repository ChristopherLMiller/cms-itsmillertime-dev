import { Redis } from '@upstash/redis';

interface CacheConfig {
  url: string;
  token: string;
  prefix?: string;
  ttl?: number;
}

/** Upstash REST cache — key format matches www `cacheManager` (`payload:` prefix). */
export class UpstashCache {
  private redis: Redis;
  private prefix: string;
  private ttl: number;

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      url: config.url,
      token: config.token,
    });
    this.prefix = config.prefix ?? 'payload:';
    this.ttl = config.ttl ?? 86400;
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  createKey(endpoint: string): string {
    return this.formatKey(endpoint);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(key, value);
    pipeline.expire(key, ttl ?? this.ttl);
    await pipeline.exec();
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
