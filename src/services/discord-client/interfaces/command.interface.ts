import {
  ApplicationCommandOptionData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ICustomClient } from './custom-client.interface';
import CommandCategory from '../types/command-category.enum';

export interface ICommand {
  client: ICustomClient;
  name: string;
  description: string;
  category: CommandCategory;
  options: ApplicationCommandOptionData[];
  parentName?: string;
  default_member_permissions: bigint;
  dm_permission: boolean;
  cooldown: number;
  dev: boolean;

  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autoComplete(interaction: AutocompleteInteraction): Promise<void>;
}
