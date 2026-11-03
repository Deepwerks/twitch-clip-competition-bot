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

export default class Invite extends Command {
  constructor(client: CustomClient) {
    super(client, {
      name: 'invite',
      description: "Retrieves the bot's invite link",
      category: CommandCategory.Utility,
      default_member_permissions: PermissionsBitField.Flags.UseApplicationCommands,
      dm_permission: true,
      cooldown: 3,
      options: [],
      dev: true,
    });
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const inviteLink = this.client.getInviteLink();

    await interaction.reply({
      components: [
        new ContainerBuilder().addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`## Invite ${this.client.user?.displayName}\n`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setLabel('Invite Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteLink)
            )
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
