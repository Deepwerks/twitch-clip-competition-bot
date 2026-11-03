import {
  Events,
  Interaction,
  InteractionType,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';
import { Event } from '../../../classes/event';
import { CustomClient } from '../../../classes/custom-client';
import { EmbedResponses } from '../../embeds/error.embeds';
import { logger } from '../../../../../libs/logger';

export default class ModalEvent extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.InteractionCreate,
      description: 'Modal handler event',
      once: false,
    });
  }

  async execute(interaction: Interaction) {
    if (!interaction.isModalSubmit()) {
      return;
    }

    await this.handleModalInteraction(interaction);
  }

  private async handleModalInteraction(interaction: ModalSubmitInteraction) {
    const startedAt = Date.now();
    const modal = this.client.modals.get(interaction.customId);

    if (!modal) {
      await this.replyWithMissingModal(interaction, interaction.customId);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
      //     outcome: 'unknown_modal',
      //   });
      return;
    }

    // try {
    //   const ban = await userBanService.findActiveByDiscordId(interaction.user.id);

    //   if (ban) {
    //     const expiryText = ban.expires_at
    //       ? `Your ban expires <t:${Math.floor(ban.expires_at.getTime() / 1000)}:R>.`
    //       : 'Your ban is permanent.';

    //     await interaction.reply({
    //       content: [
    //         '⛔ **You are banned from using this bot.**',
    //         '',
    //         `**Reason:** ${ban.reason}`,
    //         expiryText,
    //       ].join('\n'),
    //       flags: MessageFlags.Ephemeral,
    //     });

    //     // this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
    //     //   outcome: 'user_banned',
    //     //   banId: ban.id,
    //     // });

    //     return;
    //   }
    // } catch (error) {
    //   logger.discord.error('Failed to check user bot-ban status for modal submission.', {
    //     userId: interaction.user.id,
    //     customId: interaction.customId,
    //     error,
    //   });

    //   await interaction.reply({
    //     content: '❌ Unable to verify your access right now. Please try again later.',
    //     flags: MessageFlags.Ephemeral,
    //   });

    // //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error, {
    // //     outcome: 'ban_check_failed',
    // //   });

    //   return;
    // }

    try {
      logger.discord.debug(`Executing modal handler: ${interaction.customId}`);
      await modal.execute(interaction);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt);
    } catch (error) {
      //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error);
      logger.discord.error('Modal handler failed', {
        id: interaction.id,
        guildId: interaction.inGuild() ? interaction.guildId : null,
        customId: interaction.customId,
        type: InteractionType.ModalSubmit,
        userId: interaction.user.id,
        error,
      });

      const genericErrorEmbed = EmbedResponses.genericError();
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [genericErrorEmbed] });
      } else {
        await interaction.reply({
          embeds: [genericErrorEmbed],
          flags: ['Ephemeral'],
        });
      }
    }
  }

  private async replyWithMissingModal(interaction: ModalSubmitInteraction, label: string) {
    logger.discord.warn(`Received interaction for unknown modal handler: ${label}`);

    const response = {
      embeds: [EmbedResponses.unknownCommand()],
      flags: ['Ephemeral'] as const,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: response.embeds });
    } else {
      await interaction.reply(response);
    }
  }
}
