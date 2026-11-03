import {
  Collection,
  Events,
  Interaction,
  InteractionType,
  MessageFlags,
  StringSelectMenuInteraction,
} from 'discord.js';
import { Event } from '../../../classes/event';
import { CustomClient } from '../../../classes/custom-client';
import { ISelectMenu } from '../../../interfaces/select-menu.interface';
import { EmbedResponses } from '../../embeds/error.embeds';
import { logger } from '../../../../../libs/logger';

export default class MenuEvent extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.InteractionCreate,
      description: 'Select menu handler event',
      once: false,
    });
  }

  async execute(interaction: Interaction) {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    await this.handleSelectMenuInteraction(interaction);
  }

  private async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
    const startedAt = Date.now();
    const menu =
      this.client.selectMenus.get(interaction.customId) ??
      [...this.client.selectMenus.values()].find((candidate) =>
        interaction.customId.startsWith(`${candidate.customId}:`)
      );

    if (!menu) {
      await this.replyWithMissingMenu(interaction, interaction.customId);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
      //     outcome: 'unknown_select_menu',
      //   });
      return;
    }

    // try {
    //   const ban = await userBanService.findActiveByDiscordId(interaction.user.id);

    //   if (ban) {
    //     const expiryText = ban.expires_at
    //       ? `This ban expires <t:${Math.floor(new Date(ban.expires_at).getTime() / 1000)}:F>.`
    //       : 'This ban is permanent.';

    //     await interaction.reply({
    //       embeds: [
    //         EmbedResponses.genericError().setDescription(
    //           `You are banned from using this bot.\n**Reason:** ${ban.reason}\n${expiryText}`
    //         ),
    //       ],
    //       flags: MessageFlags.Ephemeral,
    //     });

    //     this.recordInteraction(interaction, interaction.customId, false, startedAt, undefined, {
    //       outcome: 'user_banned',
    //       banId: ban.id,
    //     });

    //     return;
    //   }
    // } catch (error) {
    //   logger.discord.error('Failed to check user ban before select menu execution', {
    //     id: interaction.id,
    //     guildId: interaction.inGuild() ? interaction.guildId : null,
    //     customId: interaction.customId,
    //     userId: interaction.user.id,
    //     error,
    //   });

    //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error, {
    //     outcome: 'ban_check_failed',
    //   });

    //   await interaction.reply({
    //     embeds: [
    //       EmbedResponses.genericError().setDescription(
    //         'Unable to verify your access right now. Please try again later.'
    //       ),
    //     ],
    //     flags: MessageFlags.Ephemeral,
    //   });

    //   return;
    // }

    const { cooldowns } = this.client;
    const cooldownKey = this.getCooldownBucketKey(menu);

    if (!cooldowns.has(cooldownKey)) {
      cooldowns.set(cooldownKey, new Collection());
    }

    const timestamps = cooldowns.get(cooldownKey)!;
    const now = Date.now();
    const expires = timestamps.get(interaction.user.id);
    const cooldownAmount = (menu.cooldown ?? 0) * 1000;

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
      logger.discord.debug(`Executing select menu action: ${interaction.customId}`);
      await menu.execute(interaction);
      //   this.recordInteraction(interaction, interaction.customId, true, startedAt, undefined, {
      //     selectedCount: interaction.values.length,
      //   });

      if (cooldownAmount > 0) {
        timestamps.set(interaction.user.id, now + cooldownAmount);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount).unref();
      }
    } catch (error) {
      //   this.recordInteraction(interaction, interaction.customId, false, startedAt, error);
      logger.discord.error('Select menu action failed', {
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

  private getCooldownBucketKey(menu: ISelectMenu): string {
    return `select:${menu.customId}`;
  }

  private async replyWithMissingMenu(
    interaction: StringSelectMenuInteraction,
    label: string
  ): Promise<void> {
    logger.discord.warn(`Received interaction for unknown select menu: ${label}`);

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
