import {
  ButtonInteraction,
  Collection,
  Events,
  Interaction,
  InteractionType,
  MessageFlags,
} from 'discord.js';
import { Event } from '../../../classes/event';
import { CustomClient } from '../../../classes/custom-client';
import { IButtonAction } from '../../../interfaces/button-action.interface';
import { EmbedResponses } from '../../embeds/error.embeds';
import { logger } from '../../../../../libs/logger';

export default class ButtonEvent extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.InteractionCreate,
      description: 'Button handler event',
      once: false,
    });
  }

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    await this.handleButtonInteraction(interaction);
  }

  private async handleButtonInteraction(interaction: ButtonInteraction) {
    const startedAt = Date.now();
    const action =
      this.client.buttons.get(interaction.customId) ??
      [...this.client.buttons.values()].find((candidate) =>
        interaction.customId.startsWith(`${candidate.customId}:`)
      );

    if (!action) {
      await this.replyWithMissingAction(interaction, interaction.customId);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
      //     outcome: 'unknown_button',
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

    //     this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
    //       outcome: 'user_banned',
    //       banId: ban.id,
    //     });

    //     return;
    //   }
    // } catch (error) {
    //   logger.discord.error('Failed to check user bot-ban status for button interaction.', {
    //     userId: interaction.user.id,
    //     customId: interaction.customId,
    //     error,
    //   });

    //   await interaction.reply({
    //     content: '❌ Unable to verify your access right now. Please try again later.',
    //     flags: MessageFlags.Ephemeral,
    //   });

    //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error, {
    //     outcome: 'ban_check_failed',
    //   });

    //   return;
    // }

    const { cooldowns } = this.client;
    const cooldownKey = this.getCooldownBucketKey(action);

    if (!cooldowns.has(cooldownKey)) {
      cooldowns.set(cooldownKey, new Collection());
    }

    const timestamps = cooldowns.get(cooldownKey)!;
    const now = Date.now();
    const expires = timestamps.get(interaction.user.id);
    const cooldownAmount = (action.cooldown ?? 0) * 1000;

    if (cooldownAmount > 0 && expires && now < expires) {
      const remaining = Math.ceil((expires - now) / 1000);
      await interaction.reply({
        embeds: [EmbedResponses.cooldown(remaining)],
        flags: ['Ephemeral'],
      });
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
      //     outcome: 'cooldown',
      //     remainingSeconds: remaining,
      //   });
      return;
    }

    try {
      logger.discord.debug(`Executing button action: ${interaction.customId}`);
      await action.execute(interaction);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt);

      if (cooldownAmount > 0) {
        timestamps.set(interaction.user.id, now + cooldownAmount);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount).unref();
      }
    } catch (error) {
      //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error);
      logger.discord.error('Button action failed', {
        id: interaction.id,
        guildId: interaction.inGuild() ? interaction.guildId : null,
        customId: interaction.customId,
        type: InteractionType.MessageComponent,
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

  private getCooldownBucketKey(action: IButtonAction): string {
    return `button:${action.customId}`;
  }

  private async replyWithMissingAction(interaction: ButtonInteraction, label: string) {
    logger.discord.warn(`Received interaction for unknown button action: ${label}`);

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
