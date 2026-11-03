import { AutocompleteInteraction, ButtonInteraction } from 'discord.js';
import { IButtonAction } from '../interfaces/button-action.interface';
import { IButtonActionOptions } from '../interfaces/button-action-options.interface';
import { CustomClient } from './custom-client';

export abstract class ButtonAction implements IButtonAction {
  client: CustomClient;
  customId: string;
  description: string;
  cooldown: number;

  constructor(client: CustomClient, options: IButtonActionOptions) {
    this.client = client;
    this.customId = options.customId;
    this.description = options.description;
    this.cooldown = options.cooldown;
  }

  abstract execute(interaction: ButtonInteraction): Promise<void>;

  async autoComplete(_interaction: AutocompleteInteraction) {
    /* default no-op – can be overridden */
  }
}
