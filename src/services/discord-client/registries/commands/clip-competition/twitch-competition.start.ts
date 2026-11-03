import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
  Role,
  TextChannel,
} from 'discord.js';

import { Command } from '../../../classes/command';
import { CustomClient } from '../../../classes/custom-client';
import CommandCategory from '../../../types/command-category.enum';

import { twitchVodAnalizer } from '../../../../twitch-clips';
import { buildTwitchCompetitionMessage } from '../../../components/command/twitch-competition-message';
import { logger } from '../../../../../libs/logger';
import { twitchCompetitionRepository } from '../../../../database/repositories';

export default class TwitchCompetitionStart extends Command {
  constructor(client: CustomClient) {
    super(client, {
      parentName: 'twitch-competition',
      name: 'start',
      description: 'Start a twitch clip competition',
      category: CommandCategory.ClipCompetition,
      default_member_permissions: PermissionsBitField.Flags.Administrator,
      dm_permission: false,
      cooldown: 3,
      options: [
        {
          name: 'twitch-vod-url',
          description: 'The URL of the given VOD',
          required: true,
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'description',
          description: 'Competition announcement text',
          required: true,
          type: ApplicationCommandOptionType.String,
          min_length: 45,
          max_length: 255,
        },
        {
          name: 'channel',
          description: 'Channel to send the announcement text',
          required: true,
          type: ApplicationCommandOptionType.Channel,
        },
        {
          name: 'duration-days',
          description: 'Competition duration (defaults to 7 days)',
          required: false,
          type: ApplicationCommandOptionType.Integer,
          min_value: 1,
          max_value: 31,
        },

        {
          name: 'notified-role',
          description: 'Role to notify when the competition starts',
          required: false,
          type: ApplicationCommandOptionType.Role,
        },
        {
          name: 'banner-url',
          description: 'Optional competition banner image URL',
          required: false,
          type: ApplicationCommandOptionType.String,
        },
      ],
      dev: false,
    });
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let competitionId: string | undefined;

    try {
      const vodUrl = interaction.options.getString('twitch-vod-url', true);
      const description = interaction.options.getString('description', true);
      const channel = interaction.options.getChannel('channel', true);

      const durationDays = interaction.options.getInteger('duration-days') ?? 7;
      const notifiedRole = interaction.options.getRole('notified-role') as Role | null;
      const bannerUrl = interaction.options.getString('banner-url') ?? undefined;

      if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
      ) {
        await interaction.editReply({
          content: 'Please select a text or announcement channel.',
        });
        return;
      }

      const targetChannel = channel as TextChannel;

      if (bannerUrl) {
        try {
          const url = new URL(bannerUrl);

          if (
            !['http:', 'https:'].includes(url.protocol) ||
            !/\.(png|jpe?g|gif|webp)(?:$|\?)/i.test(url.href)
          ) {
            throw new Error('Invalid image URL');
          }
        } catch {
          await interaction.editReply({
            content: 'Please provide a valid image URL (PNG, JPG, GIF or WebP).',
          });
          return;
        }
      }

      const vod = await twitchVodAnalizer.fetchVodClipData(vodUrl);

      if (!vod) {
        await interaction.editReply({
          content: 'Failed to retrieve Twitch VOD information.',
        });
        return;
      }

      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const competition = await twitchCompetitionRepository.createCompetition({
        vod_id: vod.vod_id,
        vod_url: vodUrl,
        description,
        banner_url: bannerUrl ?? null,
        duration_days: durationDays,
        started_at: startedAt,
        ends_at: endsAt,
        created_by: interaction.user.id,
      });

      competitionId = competition.id;

      const container = buildTwitchCompetitionMessage({
        vod,
        description: competition.description,
        vodUrl: competition.vod_url,
        endsAt: competition.ends_at,
        bannerUrl: competition.banner_url ?? undefined,
        notifiedRoleId: notifiedRole?.id,
      });

      const message = await targetChannel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
          roles: notifiedRole ? [notifiedRole.id] : [],
        },
      });

      await twitchCompetitionRepository.createPost({
        competition_id: competition.id,
        guild_id: interaction.guildId!,
        channel_id: targetChannel.id,
        message_id: message.id,
        notified_role_id: notifiedRole?.id ?? null,
        last_updated_at: new Date(),
      });

      await interaction.editReply({
        content: `Competition successfully created and posted in <#${targetChannel.id}>.\n[Jump to message](${message.url})`,
      });
    } catch (error) {
      logger.discord.error('Failed to start Twitch competition:', { error });

      if (competitionId) {
        try {
          await twitchCompetitionRepository.deleteCompetition(competitionId);
        } catch (cleanupError) {
          logger.discord.error('Failed to clean up competition:', {
            error: cleanupError,
          });
        }
      }

      await interaction.editReply({
        content: 'Something went wrong while starting the Twitch competition.',
      });
    }
  }
}
