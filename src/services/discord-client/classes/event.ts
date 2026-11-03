/* eslint-disable @typescript-eslint/no-explicit-any */
import { Events } from 'discord.js';
import { IEvent } from '../interfaces/event.interface';
import { IEventOptions } from '../interfaces/event-options.interface';
import { CustomClient } from './custom-client';

export abstract class Event implements IEvent {
  client: CustomClient;
  name: Events;
  description: string;
  once: boolean;

  constructor(client: CustomClient, options: IEventOptions) {
    this.client = client;
    this.name = options.name;
    this.description = options.description;
    this.once = options.once;
  }

  abstract execute(...args: any): Promise<void>;
}
