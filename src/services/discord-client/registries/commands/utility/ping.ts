import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionsBitField,
  SectionBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { Command } from '../../../classes/command';
import { CustomClient } from '../../../classes/custom-client';
import CommandCategory from '../../../types/command-category.enum';

export default class Ping extends Command {
  constructor(client: CustomClient) {
    super(client, {
      name: 'ping',
      description: 'Check the bot latency',
      category: CommandCategory.Utility,
      default_member_permissions: PermissionsBitField.Flags.UseApplicationCommands,
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
