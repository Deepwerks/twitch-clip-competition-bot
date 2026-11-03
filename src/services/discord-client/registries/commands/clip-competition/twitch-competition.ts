import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Command } from '../../../classes/command';
import { CustomClient } from '../../../classes/custom-client';
import CommandCategory from '../../../types/command-category.enum';

export default class TwitchCompetition extends Command {
  constructor(client: CustomClient) {
    super(client, {
      name: 'twitch-competition',
      description: 'Get help to run a twitch clip competition',
      category: CommandCategory.ClipCompetition,
      default_member_permissions: PermissionsBitField.Flags.Administrator,
      dm_permission: true,
      cooldown: 3,
      options: [],
      dev: false,
    });
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply(`Pong! ${interaction.client.ws.ping}ms`);
  }
}
