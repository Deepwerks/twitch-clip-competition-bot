import { AutocompleteInteraction, StringSelectMenuInteraction } from 'discord.js';
import { ICustomClient } from './custom-client.interface';

export interface ISelectMenu {
  client: ICustomClient;
  customId: string;
  description: string;
  cooldown: number;

  execute(interaction: StringSelectMenuInteraction): Promise<void>;
  autoComplete(interaction: AutocompleteInteraction): Promise<void>;
}
