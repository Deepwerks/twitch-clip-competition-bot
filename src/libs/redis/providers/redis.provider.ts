import { RedisOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../../core/config';
import { logger } from '../../logger';

export default class RedisProvider {
  private readonly connectionConfig = config.REDIS_URL;
  private client: IORedis;
  private publisher: IORedis;
  private subscriber: IORedis;

  constructor() {
    logger.redis.info(`Connecting to: ${this.connectionConfig}`);
    if (!this.connectionConfig) {
      throw new Error('Redis initialization failed: REDIS_URL is not set');
    }

    this.client = new IORedis(this.connectionConfig);
    this.publisher = new IORedis(this.connectionConfig);
    this.subscriber = new IORedis(this.connectionConfig);

    this.attach(this.client);
    this.attach(this.publisher);
    this.attach(this.subscriber);
  }

  getConnectionConfig(): RedisOptions {
    return {
      url: this.connectionConfig,
      maxRetriesPerRequest: null,
    };
  }

  getClient() {
    return this.client;
  }

  getPubClient() {
    return this.publisher;
  }

  getSubClient() {
    return this.subscriber;
  }

  async close() {
    await Promise.all([this.client.quit(), this.publisher.quit(), this.subscriber.quit()]);
  }

  private attach(client: IORedis) {
    client.on('error', (err) => {
      logger.redis.error('Error on redis client', { message: err.message, stack: err.stack });
    });
  }
}
