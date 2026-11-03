import {
  ApplicationCommandOptionData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ICommandOptions } from '../interfaces/command-options.interface';
import { ICommand } from '../interfaces/command.interface';
import CommandCategory from '../types/command-category.enum';
import { CustomClient } from './custom-client';

export abstract class Command implements ICommand {
  client: CustomClient;
  name: string;
  description: string;
  category: CommandCategory;
  options: ApplicationCommandOptionData[];
  parentName?: string;
  default_member_permissions: bigint;
  dm_permission: boolean;
  cooldown: number;
  dev: boolean;

  constructor(client: CustomClient, options: ICommandOptions) {
    this.client = client;
    this.name = options.name;
    this.description = options.description;
    this.category = options.category;
    this.options = options.options;
    this.parentName = options.parentName;
    this.default_member_permissions = options.default_member_permissions;
    this.dm_permission = options.dm_permission;
    this.cooldown = options.cooldown;
    this.dev = options.dev;
  }

  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  async autoComplete(_interaction: AutocompleteInteraction) {
    /* default no-op – can be overridden */
  }
}
