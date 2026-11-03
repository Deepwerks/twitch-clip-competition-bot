import { ModalSubmitInteraction } from 'discord.js';
import { IModalHandler } from '../interfaces/modal-handler.interface';
import { CustomClient } from './custom-client';

export abstract class Modal implements IModalHandler {
  client: CustomClient;
  customId: string;
  description?: string;

  constructor(client: CustomClient, options: { customId: string; description?: string }) {
    this.client = client;
    this.customId = options.customId;
    this.description = options.description;
  }

  abstract execute(interaction: ModalSubmitInteraction): Promise<void>;
}
