import { AutocompleteInteraction, StringSelectMenuInteraction } from 'discord.js';
import { ISelectMenuOptions } from '../interfaces/select-menu-options.interface';
import { ISelectMenu } from '../interfaces/select-menu.interface';
import { CustomClient } from './custom-client';

export abstract class SelectMenu implements ISelectMenu {
  client: CustomClient;
  customId: string;
  description: string;
  cooldown: number;

  constructor(client: CustomClient, options: ISelectMenuOptions) {
    this.client = client;
    this.customId = options.customId;
    this.description = options.description;
    this.cooldown = options.cooldown;
  }

  abstract execute(interaction: StringSelectMenuInteraction): Promise<void>;

  async autoComplete(_interaction: AutocompleteInteraction): Promise<void> {
    /* default no-op – can be overridden */
  }
}
