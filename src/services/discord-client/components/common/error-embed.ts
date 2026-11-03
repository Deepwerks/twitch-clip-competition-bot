import { EmbedBuilder } from 'discord.js';

type ErrorEmbedOptions = {
  title: string;
  description: string;
};

const ERROR_COLOR = 0xf4566a;

export function buildErrorEmbed({ title, description }: ErrorEmbedOptions): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}
