import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Collection,
  Events,
  Interaction,
  InteractionType,
  MessageFlags,
} from 'discord.js';
import { CustomClient } from '../../../classes/custom-client';
import { Event } from '../../../classes/event';
import { ICommand } from '../../../interfaces/command.interface';
import { buildSubCommandKey } from '../../../utils/subcommand.utils';
import { EmbedResponses } from '../../embeds/error.embeds';
import { logger } from '../../../../../libs/logger';

export default class CommandHandler extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.InteractionCreate,
      description: 'Command handler event',
      once: false,
    });
  }

  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      await this.handleCommandEvent(interaction);
    } else if (interaction.isAutocomplete()) {
      await this.handleCommandAutoCompleteEvent(interaction);
    }
  }

  private async handleCommandEvent(interaction: ChatInputCommandInteraction) {
    const startedAt = Date.now();
    const rootCommand = this.client.commands.get(interaction.commandName);
    if (!rootCommand) {
      await this.replyWithUnknownCommand(interaction, interaction.commandName);
      //   this.recordInteraction(
      //     interaction,
      //     'command',
      //     interaction.commandName,
      //     true,
      //     startedAt,
      //     undefined,
      //     {
      //       outcome: 'unknown_command',
      //     }
      //   );
      return;
    }

    const resolution = this.resolveCommandTarget(interaction, rootCommand);

    if (resolution.missingSubCommand) {
      const missingName = `${resolution.missingSubCommand.parent}/${resolution.missingSubCommand.name}`;
      await this.replyWithUnknownCommand(interaction, missingName);
      //   this.recordInteraction(interaction, 'command', missingName, true, startedAt, undefined, {
      //     outcome: 'unknown_subcommand',
      //   });
      return;
    }

    const command = resolution.command;

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

    //     // this.recordInteraction(
    //     //   interaction,
    //     //   'command',
    //     //   this.describeCommand(command),
    //     //   true,
    //     //   startedAt,
    //     //   undefined,
    //     //   {
    //     //     outcome: 'user_banned',
    //     //     banId: ban.id,
    //     //   }
    //     // );

    //     return;
    //   }
    // } catch (error) {
    //   logger.discord.error('Failed to check user bot-ban status.', {
    //     userId: interaction.user.id,
    //     commandName: interaction.commandName,
    //     error,
    //   });

    //   await interaction.reply({
    //     content: '❌ Unable to verify your access right now. Please try again later.',
    //     flags: MessageFlags.Ephemeral,
    //   });

    // //   this.recordInteraction(
    // //     interaction,
    // //     'command',
    // //     this.describeCommand(command),
    // //     false,
    // //     startedAt,
    // //     error,
    // //     { outcome: 'ban_check_failed' }
    // //   );

    //   return;
    // }

    const { cooldowns } = this.client;
    const cooldownKey = this.getCooldownBucketKey(command);
    if (!cooldowns.has(cooldownKey)) {
      cooldowns.set(cooldownKey, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(cooldownKey)!;

    const expires = timestamps.get(interaction.user.id);
    const cooldownAmount = (command.cooldown ?? 1) * 1000;

    if (expires && now < expires) {
      const remaining = Math.ceil((expires - now) / 1000);
      await interaction.reply({
        embeds: [EmbedResponses.cooldown(remaining)],
        flags: ['Ephemeral'],
      });
      //   this.recordInteraction(
      //     interaction,
      //     'command',
      //     this.describeCommand(command),
      //     true,
      //     startedAt,
      //     undefined,
      //     {
      //       outcome: 'cooldown',
      //       remainingSeconds: remaining,
      //     }
      //   );

      return;
    }

    try {
      logger.discord.debug(`Executing command: ${this.describeCommand(command)}`);
      await command.execute(interaction);

      //   commandUsageService.record(this.describeCommand(command));
      //   this.recordInteraction(
      //     interaction,
      //     'command',
      //     this.describeCommand(command),
      //     true,
      //     startedAt
      //   );
      timestamps.set(interaction.user.id, now + cooldownAmount);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount).unref();
    } catch (error) {
      //   this.recordInteraction(
      //     interaction,
      //     'command',
      //     this.describeCommand(command),
      //     false,
      //     startedAt,
      //     error
      //   );
      logger.discord.error('Command execution failed', {
        id: interaction.id,
        guildId: interaction.inGuild() ? interaction.guildId : null,
        name: this.describeCommand(command),
        type: InteractionType.ApplicationCommand,
        userId: interaction.user.id,
        options: interaction.options.data,
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
  private async handleCommandAutoCompleteEvent(interaction: AutocompleteInteraction) {
    const startedAt = Date.now();
    const rootCommand = this.client.commands.get(interaction.commandName);
    if (!rootCommand) {
      //   this.recordInteraction(
      //     interaction,
      //     'autocomplete',
      //     interaction.commandName,
      //     true,
      //     startedAt,
      //     undefined,
      //     {
      //       outcome: 'unknown_command',
      //     }
      //   );
      return;
    }

    const resolution = this.resolveCommandTarget(interaction, rootCommand);

    if (resolution.missingSubCommand) {
      logger.discord.warn(
        `Autocomplete for unknown subcommand: ${resolution.missingSubCommand.parent}/${resolution.missingSubCommand.name}`
      );
      await interaction.respond([]);
      //   this.recordInteraction(
      //     interaction,
      //     'autocomplete',
      //     `${resolution.missingSubCommand.parent}/${resolution.missingSubCommand.name}`,
      //     true,
      //     startedAt,
      //     undefined,
      //     { outcome: 'unknown_subcommand' }
      //   );
      return;
    }

    const command = resolution.command;
    if (!command.autoComplete) {
      //   this.recordInteraction(
      //     interaction,
      //     'autocomplete',
      //     this.describeCommand(command),
      //     true,
      //     startedAt,
      //     undefined,
      //     {
      //       outcome: 'no_autocomplete_handler',
      //     }
      //   );
      return;
    }

    // try {
    //   const ban = await userBanService.findActiveByDiscordId(interaction.user.id);

    //   if (ban) {
    //     await interaction.respond([]);
    //     return;
    //   }
    // } catch (error) {
    //   logger.discord.error('Failed to check user bot-ban status for autocomplete.', {
    //     userId: interaction.user.id,
    //     commandName: interaction.commandName,
    //     error,
    //   });

    //   await interaction.respond([]);
    //   return;
    // }

    try {
      await command.autoComplete(interaction);
      //   this.recordInteraction(
      //     interaction,
      //     'autocomplete',
      //     this.describeCommand(command),
      //     true,
      //     startedAt
      //   );
    } catch (error) {
      //   this.recordInteraction(
      //     interaction,
      //     'autocomplete',
      //     this.describeCommand(command),
      //     false,
      //     startedAt,
      //     error
      //   );
      logger.discord.error('Command autocomplete failed', {
        id: interaction.id,
        guildId: interaction.inGuild() ? interaction.guildId : null,
        name: this.describeCommand(command),
        type: InteractionType.ApplicationCommandAutocomplete,
        userId: interaction.user.id,
        options: interaction.options.data,
        error,
      });
    }
  }

  private resolveCommandTarget(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
    rootCommand: ICommand
  ): CommandResolution {
    const subCommandName = this.getSubCommandName(interaction);

    if (!subCommandName) {
      return { command: rootCommand };
    }

    const key = buildSubCommandKey(rootCommand.name, subCommandName);
    const subCommand = this.client.subCommands.get(key);

    if (!subCommand) {
      return {
        command: rootCommand,
        missingSubCommand: { parent: rootCommand.name, name: subCommandName },
      };
    }

    return { command: subCommand };
  }

  private getSubCommandName(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction
  ): string | null {
    try {
      return interaction.options.getSubcommand(false) ?? null;
    } catch {
      return null;
    }
  }

  private getCooldownBucketKey(command: ICommand): string {
    if (command.parentName) {
      return buildSubCommandKey(command.parentName, command.name);
    }

    return command.name.toLowerCase();
  }

  private describeCommand(command: ICommand): string {
    return command.parentName ? `${command.parentName}/${command.name}` : command.name;
  }

  private async replyWithUnknownCommand(
    interaction: ChatInputCommandInteraction,
    label: string
  ): Promise<void> {
    logger.discord.warn(`Received interaction for unknown command: ${label}`);

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

interface CommandResolution {
  command: ICommand;
  missingSubCommand?: {
    parent: string;
    name: string;
  };
}
