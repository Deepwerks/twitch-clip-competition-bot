import { glob } from 'glob';
import path from 'path';

import { IHandler } from '../interfaces/handler.interface';
import { ICommand } from '../interfaces/command.interface';
import { IButtonAction } from '../interfaces/button-action.interface';
import { ISelectMenu } from '../interfaces/select-menu.interface';
import { CustomClient } from './custom-client';
import { Event } from './event';
import { Modal } from './custom-modal';
import { buildSubCommandKey, extractCommandFileMeta } from '../utils/subcommand.utils';
import { logger } from '../../../libs/logger';

const BUILT_EVENTS_PATH = 'build/services/discord-client/registries/events/**/*.js';
const BUILT_COMMANDS_PATH = 'build/services/discord-client/registries/commands/**/*.js';
const BUILT_BUTTON_ACTIONS_PATH = 'build/services/discord-client/registries/buttons/**/*.js';
const BUILT_MODALS_PATH = 'build/services/discord-client/registries/modals/**/*.js';
const BUILT_SELECT_MENUS_PATH = 'build/services/discord-client/registries/menus/**/*.js';

const isLoadableRegistryFile = (filePath: string) => {
  const fileName = path.basename(filePath);
  return !fileName.endsWith('.base.js') && !fileName.endsWith('.components.js');
};

export class Handler implements IHandler {
  client: CustomClient;

  constructor(client: CustomClient) {
    this.client = client;
  }

  async loadEvents() {
    const files = (await glob(BUILT_EVENTS_PATH)).map((filePath: string) => path.resolve(filePath));

    logger.discord.info(`Loading ${files.length}x events...`);

    for (const file of files) {
      logger.discord.debug(`Loading event: ${file}`);
      try {
        const event: Event = new (await import(file)).default(this.client);

        if (!event.name) {
          delete require.cache[require.resolve(file)];
          logger.discord.info(`${file.split('/').pop()} does not have a name.`);
          continue;
        }

        const execute = (...args: any) => {
          void Promise.resolve(event.execute(...args)).catch((error) => {
            logger.discord.error(`Unhandled event handler failure for ${event.name}`, { error });
          });
        };

        //@ts-expect-error DISCORD-JS-TYPE
        if (event.once) this.client.once(event.name, execute);
        //@ts-expect-error DISCORD-JS-TYPE
        else this.client.on(event.name, execute);

        delete require.cache[require.resolve(file)];
      } catch (error) {
        logger.discord.error(`Failed to load event ${file}`, { error });
      }
    }
  }
  async loadCommands() {
    const files = (await glob(BUILT_COMMANDS_PATH))
      .filter(isLoadableRegistryFile)
      .map((filePath: string) => path.resolve(filePath));

    logger.discord.info(`Loading ${files.length}x commands...`);

    const pendingSubCommands = new Map<string, ICommand[]>();

    for (const file of files) {
      logger.discord.debug(`Loading command: ${file}`);
      try {
        const command: ICommand = new (await import(file)).default(this.client);

        if (!command.name) {
          delete require.cache[require.resolve(file)];
          logger.discord.info(`${file.split('/').pop()} does not have a name.`);
          continue;
        }

        const fileName = file.split('/').pop() ?? '';
        const fileMeta = extractCommandFileMeta(fileName);
        const isSubCommand = Boolean(fileMeta.subCommandSegment);

        if (isSubCommand) {
          const parentNameFromFile = fileMeta.parentSegment;
          const subNameFromFile = fileMeta.subCommandSegment ?? '';

          if (!command.parentName) {
            command.parentName = parentNameFromFile;
          } else if (
            command.parentName.trim().toLowerCase() !== parentNameFromFile.trim().toLowerCase()
          ) {
            logger.discord.warn(
              `${fileName} parentName mismatch (file=${parentNameFromFile}, command=${command.parentName}).`
            );
          }

          if (
            subNameFromFile &&
            command.name.trim().toLowerCase() !== subNameFromFile.trim().toLowerCase()
          ) {
            logger.discord.warn(
              `${fileName} declares subcommand name '${subNameFromFile}' but command is '${command.name}'.`
            );
          }

          if (!command.parentName) {
            logger.discord.warn(
              `${fileName} is treated as a subcommand but parent name could not be set.`
            );
            continue;
          }

          const key = buildSubCommandKey(command.parentName, command.name);
          if (this.client.subCommands.has(key)) {
            logger.discord.warn(`Duplicate subcommand detected for key ${key} — skipping.`);
            continue;
          }

          this.client.subCommands.set(key, command as ICommand);

          const parentKey = command.parentName;
          if (!pendingSubCommands.has(parentKey)) {
            pendingSubCommands.set(parentKey, []);
          }

          pendingSubCommands.get(parentKey)!.push(command);
        } else {
          this.client.commands.set(command.name, command as ICommand);
        }

        delete require.cache[require.resolve(file)];
      } catch (error) {
        logger.discord.error(`Failed to load command ${file}`, { error });
      }
    }

    this.validateLoadedSubCommands(pendingSubCommands);
  }

  async loadButtonActions() {
    const files = (await glob(BUILT_BUTTON_ACTIONS_PATH))
      .filter(isLoadableRegistryFile)
      .map((filePath: string) => path.resolve(filePath));

    logger.discord.info(`Loading ${files.length}x button actions...`);

    for (const file of files) {
      logger.discord.debug(`Loading button action: ${file}`);
      try {
        const buttonAction: IButtonAction = new (await import(file)).default(this.client);

        if (!buttonAction.customId) {
          delete require.cache[require.resolve(file)];
          logger.discord.info(`${file.split('/').pop()} does not have an id.`);
          continue;
        }

        this.client.buttons.set(buttonAction.customId, buttonAction as IButtonAction);

        delete require.cache[require.resolve(file)];
      } catch (error) {
        logger.discord.error(`Failed to load button action ${file}`, { error });
      }
    }
  }

  private validateLoadedSubCommands(registry: Map<string, ICommand[]>) {
    if (!registry.size) {
      return;
    }

    for (const [parentName, subCommands] of registry) {
      if (!this.client.commands.has(parentName)) {
        logger.discord.warn(
          `Loaded ${subCommands.length} subcommand(s) for missing parent command: ${parentName}`
        );
        continue;
      }

      logger.discord.debug(
        `Registered ${subCommands.length} subcommand(s) for parent command: ${parentName}`
      );
    }
  }

  async loadModals() {
    const files = (await glob(BUILT_MODALS_PATH)).map((filePath: string) => path.resolve(filePath));

    logger.discord.info(`Loading ${files.length}x modals...`);

    for (const file of files) {
      logger.discord.debug(`Loading modal: ${file}`);
      try {
        const ModalClass = (await import(file)).default;
        const modal: Modal = new ModalClass(this.client);

        if (!modal.customId || typeof modal.execute !== 'function') {
          logger.discord.warn(`${file.split('/').pop()} is missing customId or Execute.`);
          delete require.cache[require.resolve(file)];
          continue;
        }

        this.client.modals.set(modal.customId, modal);
        delete require.cache[require.resolve(file)];
      } catch (error) {
        logger.discord.error(`Failed to load modal ${file}`, { error });
      }
    }
  }
  async loadSelectMenus() {
    const files = (await glob(BUILT_SELECT_MENUS_PATH)).map((filePath: string) =>
      path.resolve(filePath)
    );

    logger.discord.info(`Loading ${files.length}x select menus...`);

    for (const file of files) {
      logger.discord.debug(`Loading select menu: ${file}`);
      try {
        const SelectMenuClass = (await import(file)).default;
        const selectMenu: ISelectMenu = new SelectMenuClass(this.client);

        if (!selectMenu.customId || typeof selectMenu.execute !== 'function') {
          logger.discord.warn(`${file.split('/').pop()} is missing customId or Execute.`);
          delete require.cache[require.resolve(file)];
          continue;
        }

        this.client.selectMenus.set(selectMenu.customId, selectMenu);
        delete require.cache[require.resolve(file)];
      } catch (error) {
        logger.discord.error(`Failed to load select menu ${file}`, { error });
      }
    }
  }
}
