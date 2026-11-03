import { ICommandOptions } from '../interfaces/command-options.interface';
import { Command } from './command';
import { CustomClient } from './custom-client';

export abstract class SubCommand extends Command {
  constructor(client: CustomClient, options: ICommandOptions) {
    if (!options.parentName) {
      throw new Error('SubCommand requires parentName to be specified.');
    }

    super(client, options);
  }
}
