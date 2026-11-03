import {
  ChannelType,
  MessageFlags,
  PermissionsBitField,
  StringSelectMenuInteraction,
} from 'discord.js';
import { logger } from '../../../../libs/logger';
import { twitchCompetitionRepository } from '../../../database/repositories';
import { twitchVodAnalizer } from '../../../twitch-clips';
import { CustomClient } from '../../classes/custom-client';
import { SelectMenu } from '../../classes/select-menu';
import { buildTwitchCompetitionMessage } from '../../components/command/twitch-competition-message';
import { TWITCH_COMPETITION_REPOST_MENU_ID } from '../commands/clip-competition/twitch-competition.repost';

export default class TwitchCompetitionRepostSelectMenu extends SelectMenu {
  constructor(client: CustomClient) {
    super(client, {
      customId: TWITCH_COMPETITION_REPOST_MENU_ID,
      description: 'Select an active Twitch competition to repost',
      cooldown: 3,
    });
  }

  async execute(interaction: StringSelectMenuInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: 'This menu can only be used in a server.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You must be a server administrator to repost a competition.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const [, channelId, roleId] = interaction.customId.split(':');

      if (!channelId || !roleId || interaction.values.length !== 1) {
        await interaction.editReply({
          content: 'This repost menu is invalid. Please run the command again.',
          components: [],
        });
        return;
      }

      const channel = await interaction.guild.channels.fetch(channelId);

      if (
        !channel ||
        (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
      ) {
        await interaction.editReply({
          content: 'The selected destination channel is no longer available.',
          components: [],
        });
        return;
      }

      const competitionId = interaction.values[0];

      // Fetch active competitions again to ensure the selected competition
      // has not expired since the menu was created.
      const competitions = await twitchCompetitionRepository.findActive();
      const competition = competitions.find((item) => item.id === competitionId);

      if (!competition) {
        await interaction.editReply({
          content: 'This competition is no longer active. Please run the command again.',
          components: [],
        });
        return;
      }

      const existingPost = await twitchCompetitionRepository.findPost(
        competition.id,
        interaction.guildId
      );

      if (existingPost) {
        await interaction.editReply({
          content: 'This competition has already been posted in this server.',
          components: [],
        });
        return;
      }

      const notifiedRoleId = roleId === 'none' ? undefined : roleId;

      const vod = await twitchVodAnalizer.fetchVodClipData(competition.vod_url);

      if (!vod) {
        await interaction.editReply({
          content: 'Failed to retrieve Twitch VOD information.',
          components: [],
        });
        return;
      }

      const container = buildTwitchCompetitionMessage({
        vod,
        description: competition.description,
        vodUrl: competition.vod_url,
        endsAt: competition.ends_at,
        bannerUrl: competition.banner_url ?? undefined,
        notifiedRoleId,
      });

      const message = await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
          roles: notifiedRoleId ? [notifiedRoleId] : [],
        },
      });

      try {
        await twitchCompetitionRepository.createPost({
          competition_id: competition.id,
          guild_id: interaction.guildId,
          channel_id: channel.id,
          message_id: message.id,
          notified_role_id: notifiedRoleId ?? null,
          last_updated_at: new Date(),
        });
      } catch (error) {
        // Avoid leaving an announcement that is not tracked in the database.
        await message.delete().catch((deleteError) => {
          logger.discord.error('Failed to delete untracked Twitch competition message', {
            messageId: message.id,
            error: deleteError,
          });
        });

        throw error;
      }

      await interaction.editReply({
        content: [
          `Competition successfully reposted in <#${channel.id}>.`,
          `[Jump to message](${message.url})`,
        ].join('\n'),
        components: [],
      });
    } catch (error) {
      logger.discord.error('Failed to repost Twitch competition', {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        error,
      });

      await interaction.editReply({
        content: 'Something went wrong while reposting the Twitch competition.',
        components: [],
      });
    }
  }
}
