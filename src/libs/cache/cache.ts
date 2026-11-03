import crypto, { randomUUID } from 'crypto';
import { type Redis } from 'ioredis';

import RedisProvider from '../redis/providers/redis.provider';
import { CacheAdapter } from './interfaces/cache-adapter.interface';
import CacheOptions from './interfaces/cache-options.interface';
import { ConsumeCounterResult } from './interfaces/consume-counter.interface';

export default class RedisCache implements CacheAdapter {
  private readonly appName: string = 'deadlockassistant-bot';
  private namespace: string;
  private version: string;
  private redis: Redis;
  private ttlS: number;

  constructor(redisProvider: RedisProvider, options?: CacheOptions) {
    this.redis = redisProvider.getClient();

    this.namespace = options?.namespace ?? 'app';
    this.version = options?.version ?? 'v1';
    this.ttlS = options?.ttlSeconds || 60;
  }

  private buildKey(key: string): string {
    const hash = crypto.createHash('sha1').update(key).digest('hex');

    return `${this.appName}:${this.namespace}:${this.version}:${hash}`;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async get<T>(key: string): Promise<T | null> {
    const redisKey = this.buildKey(key);

    try {
      const value = await this.redis.get(redisKey);
      const hit = Boolean(value);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl = this.ttlS): Promise<void> {
    const redisKey = this.buildKey(key);

    try {
      await this.redis.set(redisKey, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    const startedAt = Date.now();
    try {
      await this.redis.del(this.buildKey(key));
    } catch (error) {
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const startedAt = Date.now();
    try {
      const exists = (await this.redis.exists(this.buildKey(key))) === 1;
      return exists;
    } catch (error) {
      throw error;
    }
  }

  async getOrSet<T>(key: string, resolver: () => Promise<T>, ttl = this.ttlS): Promise<T> {
    const redisKey = this.buildKey(key);
    const lockKey = `${redisKey}:lock`;

    try {
      const cached = await this.redis.get(redisKey);

      if (cached) {
        return JSON.parse(cached) as T;
      }

      const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

      if (!lock) {
        await this.sleep(100);
        return this.getOrSet(key, resolver, ttl);
      }

      try {
        const data = await resolver();

        await this.redis.set(redisKey, JSON.stringify(data), 'EX', ttl);

        return data;
      } finally {
        await this.redis.del(lockKey);
      }
    } catch (error) {
      throw error;
    }
  }

  async setMany<T>(items: Array<{ key: string; value: T }>, ttl = this.ttlS) {
    const pipe = this.redis.pipeline();

    for (const item of items) {
      pipe.set(this.buildKey(item.key), JSON.stringify(item.value), 'EX', ttl);
    }

    try {
      await pipe.exec();
    } catch (error) {
      throw error;
    }
  }

  async consumeCounter(key: string, limit: number, ttl: number): Promise<ConsumeCounterResult> {
    const redisKey = this.buildKey(key);

    const script = `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    local limit = tonumber(ARGV[1])
    local ttl = tonumber(ARGV[2])

    if current >= limit then
      return {0, current}
    end

    current = redis.call('INCR', KEYS[1])

    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ttl)
    else
      local currentTtl = redis.call('TTL', KEYS[1])

      if currentTtl < 0 then
        redis.call('EXPIRE', KEYS[1], ttl)
      end
    end

    return {1, current}
  `;

    const result = (await this.redis.eval(script, 1, redisKey, limit, ttl)) as [number, number];

    const allowed = Number(result[0]) === 1;
    const value = Number(result[1]);

    return {
      allowed,
      value,
    };
  }

  async decrementCounter(key: string): Promise<number> {
    const redisKey = this.buildKey(key);

    const script = `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')

    if current <= 0 then
      return 0
    end

    return redis.call('DECR', KEYS[1])
  `;

    const result = await this.redis.eval(script, 1, redisKey);

    const value = Number(result);

    return value;
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const redisKey = this.buildKey(key);
    const token = randomUUID();

    try {
      const result = await this.redis.set(redisKey, token, 'EX', ttlSeconds, 'NX');
      const acquired = result === 'OK';
      return acquired ? token : null;
    } catch (error) {
      throw error;
    }
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const redisKey = this.buildKey(key);

    const script = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    end

    return 0
  `;

    try {
      const result = Number(await this.redis.eval(script, 1, redisKey, token));
      const released = result === 1;
      return released;
    } catch (error) {
      throw error;
    }
  }
}
