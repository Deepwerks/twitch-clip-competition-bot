import { AutocompleteInteraction, ButtonInteraction } from 'discord.js';
import { ICustomClient } from './custom-client.interface';

export interface IButtonAction {
  client: ICustomClient;
  customId: string;
  description: string;
  cooldown: number;

  execute(interaction: ButtonInteraction): Promise<void>;
  autoComplete(interaction: AutocompleteInteraction): Promise<void>;
}
