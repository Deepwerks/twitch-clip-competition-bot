/* eslint-disable @typescript-eslint/no-explicit-any */
import { Events } from 'discord.js';
import { ICustomClient } from './custom-client.interface';

export interface IEvent {
  client: ICustomClient;
  name: Events;
  description: string;
  once: boolean;

  execute(...args: any): Promise<void>;
}
