import {
  Client,
  Collection,
  GatewayIntentBits,
  OAuth2Scopes,
  Partials,
  PermissionResolvable,
  PermissionsBitField,
} from 'discord.js';
import { AutoPoster } from 'topgg-autoposter';

import { ICustomClient } from '../interfaces/custom-client.interface';
import { IButtonAction } from '../interfaces/button-action.interface';
import { ICommand } from '../interfaces/command.interface';
import { IHandler } from '../interfaces/handler.interface';
import { IModalHandler } from '../interfaces/modal-handler.interface';
import { ISelectMenu } from '../interfaces/select-menu.interface';
import { Handler } from './handler';
import { config } from '../../../core/config';
import { logger } from '../../../libs/logger';

export class CustomClient extends Client implements ICustomClient {
  handler: IHandler;
  requiredPermissions: PermissionResolvable[];
  commands: Collection<string, ICommand>;
  subCommands: Collection<string, ICommand>;
  buttons: Collection<string, IButtonAction>;
  modals: Collection<string, IModalHandler>;
  selectMenus: Collection<string, ISelectMenu>;
  cooldowns: Collection<string, Collection<string, number>>;
  developmentMode: boolean;
  initialized: boolean;

  constructor() {
    const intents: GatewayIntentBits[] = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ];

    super({
      intents,
      partials: [Partials.Channel],
    });

    this.handler = new Handler(this);
    this.commands = new Collection();
    this.subCommands = new Collection();
    this.buttons = new Collection();
    this.modals = new Collection();
    this.selectMenus = new Collection();
    this.cooldowns = new Collection();
    this.developmentMode = config.NODE_ENV === 'development';
    this.requiredPermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ReadMessageHistory,
    ];

    this.initialized = false;
  }

  async init() {
    logger.discord.info(`Starting discord bot...`);

    await this.loadHandlers();

    this.login(config.DISCORD_BOT_TOKEN).catch((err) =>
      logger.discord.error('Failed to sign in to discord bot...', { error: err })
    );

    if (config.NODE_ENV === 'production') {
      await this.postStatsToTopGG();
    }

    this.initialized = true;
    logger.discord.info(`Discord bot initialized in ${config.NODE_ENV} mode!`);
  }

  async loadHandlers() {
    await this.handler.loadEvents();
    await this.handler.loadModals();
    await this.handler.loadCommands();
    await this.handler.loadButtonActions();
    await this.handler.loadSelectMenus();
  }

  getInviteLink(): string {
    return this.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: new PermissionsBitField(this.requiredPermissions),
    });
  }

  private async postStatsToTopGG() {
    logger.discord.info('Posting stats to top.gg...');

    try {
      const token = config.TOPGG_TOKEN;
      if (!token) {
        logger.discord.warn('Skipping stats post to top.gg: no token configured');
        return;
      }

      const ap = AutoPoster(token, this);

      ap.on('posted', async () => {
        logger.discord.info('Stats posted to top.gg!');
      });

      ap.on('error', async (err) => {
        logger.discord.error('Failed to post stats to top.gg', { error: err });
      });
    } catch (error) {
      logger.discord.info('Failed to post stats to top.gg', { error: error });
    }
  }
}
