import { Collection, PermissionResolvable } from 'discord.js';
import { IHandler } from './handler.interface';
import { IButtonAction } from './button-action.interface';
import { ICommand } from './command.interface';
import { IModalHandler } from './modal-handler.interface';
import { ISelectMenu } from './select-menu.interface';

export interface ICustomClient {
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

  init(): void;
  loadHandlers(): void;
  getInviteLink(): string;
}
