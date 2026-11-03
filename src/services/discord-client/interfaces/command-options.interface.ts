import { ApplicationCommandOptionData } from 'discord.js';
import CommandCategory from '../types/command-category.enum';

export interface ICommandOptions {
  name: string;
  description: string;
  category: CommandCategory;
  options: ApplicationCommandOptionData[];
  parentName?: string;
  default_member_permissions: bigint;
  dm_permission: boolean;
  cooldown: number;
  dev: boolean;
}
