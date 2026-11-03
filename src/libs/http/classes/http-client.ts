import axios, { type AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ZodType } from 'zod';
import { logger } from '../../logger/index';

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs?: number;
  apiKey?: string;
  retries?: number; // max retry attempts (default 0)
  retryDelayMs?: number; // delay between retries in ms (default 500)
}

interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
}

export interface HttpRequestOptions<T> extends RetryOptions {
  schema?: ZodType<T>;
  config?: AxiosRequestConfig;
}

class HttpClient {
  private readonly client: AxiosInstance;
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(options: HttpClientOptions) {
    this.retries = options.retries ?? 0;
    this.retryDelayMs = options.retryDelayMs ?? 500;

    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeoutMs ?? 10_000,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
        ...(options.apiKey && { 'X-API-Key': options.apiKey }),
        ...(options.apiKey && { 'x-api-key': options.apiKey }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      config.metadata = { start: Date.now() };
      return config;
    });

    this.client.interceptors.response.use(
      (response) => this.logResponse(response),
      (error: AxiosError) => this.logError(error)
    );
  }

  private logResponse<T>(response: AxiosResponse<T>) {
    const ms = Date.now() - (response.config.metadata?.start ?? Date.now());
    logger.http.debug('HTTP request completed', {
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      durationMs: ms,
    });
    return response;
  }

  private logError(error: AxiosError) {
    const config = error.config;
    logger.http.error('HTTP request failed', {
      method: config?.method,
      url: config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }

  private async requestWithRetry<T>(
    fn: () => Promise<AxiosResponse<T>>,
    url: string,
    retryOptions?: RetryOptions
  ): Promise<AxiosResponse<T>> {
    const maxRetries = retryOptions?.retries ?? this.retries;
    const retryDelayMs = retryOptions?.retryDelayMs ?? this.retryDelayMs;
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const status = (err as AxiosError)?.response?.status;
        const isClientError = status !== undefined && status >= 400 && status < 500;
        if (attempt >= maxRetries || isClientError) throw err;
        attempt++;
        logger.http.warn(`Retrying request to ${url} (attempt ${attempt}/${maxRetries})`);
        await new Promise((res) => setTimeout(res, retryDelayMs));
      }
    }
  }

  async get<T>(url: string, options?: HttpRequestOptions<T>): Promise<T> {
    const res = await this.requestWithRetry(
      () => this.client.get(url, options?.config),
      url,
      options
    );
    return this.validate(options?.schema, res.data, url);
  }

  async post<T>(url: string, body?: unknown, options?: HttpRequestOptions<T>): Promise<T> {
    const res = await this.requestWithRetry(
      () => this.client.post(url, body, options?.config),
      url,
      options
    );
    return this.validate(options?.schema, res.data, url);
  }

  async put<T>(url: string, body?: unknown, options?: HttpRequestOptions<T>): Promise<T> {
    const res = await this.requestWithRetry(
      () => this.client.put(url, body, options?.config),
      url,
      options
    );
    return this.validate(options?.schema, res.data, url);
  }

  async delete<T>(url: string, options?: HttpRequestOptions<T>): Promise<T> {
    const res = await this.requestWithRetry(
      () => this.client.delete(url, options?.config),
      url,
      options
    );
    return this.validate(options?.schema, res.data, url);
  }

  private validate<T>(schema: ZodType<T> | undefined, data: unknown, url: string): T {
    if (!schema) {
      return data as T;
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      logger.http.error('Invalid API response shape', { url, issues: result.error.issues });
      throw new Error(`Invalid response schema from ${url}`);
    }
    return result.data;
  }
}

export default HttpClient;
