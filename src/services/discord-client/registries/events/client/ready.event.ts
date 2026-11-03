import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ApplicationCommandSubCommandData,
  ApplicationCommandSubGroupData,
  Events,
  REST,
  RESTPutAPIApplicationCommandsResult,
  Routes,
} from 'discord.js';

import { CustomClient } from '../../../classes/custom-client';
import { Event } from '../../../classes/event';
import { ICommand } from '../../../interfaces/command.interface';
import { logger } from '../../../../../libs/logger';
import { config } from '../../../../../core/config';

export default class Ready extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.ClientReady,
      description: 'Ready Event',
      once: true,
    });
  }

  async execute() {
    logger.discord.info(`${this.client.user?.displayName} is now ready!`);
    await this.registerSlashCommands();
  }

  private async registerSlashCommands() {
    const clientId = config.DISCORD_CLIENT_ID;
    const rest = new REST().setToken(config.DISCORD_BOT_TOKEN);

    await this.registerGlobalCommands(clientId, rest);
    await this.registerDeveloperCommands(clientId, rest);
  }

  private async registerGlobalCommands(clientId: string, rest: REST) {
    if (this.client.developmentMode) {
      logger.discord.info('Development mode: clearing global commands...');
      // Clear global commands in dev mode so promoted dev→global commands
      // don't linger if the bot is never deployed to production.
      await this.putCommands(rest, Routes.applicationCommands(clientId), []);
      return;
    }

    const globalCommands = this.client.commands.filter((cmd) => !cmd.dev);
    await this.putCommands(rest, Routes.applicationCommands(clientId), [
      ...globalCommands.values(),
    ]);
  }

  private async registerDeveloperCommands(clientId: string, rest: REST) {
    if (!config.DEVELOPER_GUILD_ID) {
      logger.discord.info('Skipping developer commands: missing DEVELOPER_GUILD_ID...');
      return;
    }

    const guildRoute = Routes.applicationGuildCommands(clientId, config.DEVELOPER_GUILD_ID);

    // In development mode, every command (dev + global) is registered to the
    // developer guild, since global commands are cleared in that mode.
    // In production, only dev-flagged commands live in the developer guild.
    // Always put the payload (even an empty array) so stale commands are removed
    // on next startup, e.g. commands flipped from dev→global.
    const commandsForGuild = this.client.developmentMode
      ? this.client.commands
      : this.client.commands.filter((cmd) => cmd.dev);

    if (this.client.developmentMode) {
      logger.discord.info('Development mode: registering all commands to the developer guild...');
    }

    await this.putCommands(rest, guildRoute, [...commandsForGuild.values()]);
  }

  private async putCommands(rest: REST, route: `/${string}`, commands: ICommand[]) {
    const label = commands.length
      ? `${commands.length} command(s)`
      : 'empty payload (clearing stale commands)';

    try {
      const result = (await rest.put(route, {
        body: commands.map((cmd) => this.toJson(cmd)),
      })) as RESTPutAPIApplicationCommandsResult;

      logger.discord.info(`Successfully registered ${result.length} commands to: ${route}`);
    } catch (error) {
      logger.discord.error(`Failed to register ${label} to: ${route}`, { error });
    }
  }

  private toJson(command: ICommand): object {
    const options = this.buildCommandOptions(command);

    return {
      name: command.name,
      description: command.description,
      options: options.length ? options : undefined,
      default_member_permissions: command.default_member_permissions?.toString() ?? null,
      dm_permission: command.dm_permission,
    };
  }

  private buildCommandOptions(command: ICommand): CommandOption[] {
    const baseOptions: CommandOption[] = [...(command.options ?? [])];

    const subCommands = this.client.subCommands.filter(
      (subCommand) => subCommand.parentName === command.name
    );

    if (!subCommands.size) {
      return baseOptions;
    }

    const serializedSubCommands = subCommands.map<ApplicationCommandSubCommandData>(
      (subCommand) => ({
        type: ApplicationCommandOptionType.Subcommand,
        name: subCommand.name,
        description: subCommand.description,
        options: subCommand.options as unknown as readonly SubCommandOptionData[],
      })
    );

    return [...baseOptions, ...serializedSubCommands];
  }
}

type CommandOption = ApplicationCommandOptionData | ApplicationCommandSubCommandData;
type SubCommandOptionData = Exclude<
  ApplicationCommandOptionData,
  ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
>;
