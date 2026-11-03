import { Events } from 'discord.js';

export interface IEventOptions {
  name: Events;
  description: string;
  once: boolean;
}
