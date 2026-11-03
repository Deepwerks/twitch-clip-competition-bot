import { ICustomClient } from './custom-client.interface';

export interface IHandler {
  client: ICustomClient;
  loadEvents(): Promise<void>;
  loadCommands(): Promise<void>;
  loadButtonActions(): Promise<void>;
  loadModals(): Promise<void>;
  loadSelectMenus(): Promise<void>;
}
