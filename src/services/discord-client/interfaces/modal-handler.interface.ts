import { ModalSubmitInteraction } from 'discord.js';

export interface IModalHandler {
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}
