import { EmbedBuilder } from 'discord.js';

type ErrorEmbedOptions = {
  title: string;
  description: string;
};

const ERROR_COLOR = 0xf4566a;

function buildErrorEmbed({ title, description }: ErrorEmbedOptions): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}

const EmbedResponses = {
  cooldown(seconds: number): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Slow down',
      description: `Please wait another ${seconds} seconds before using this command again.`,
    });
  },
  genericError(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Something went wrong',
      description:
        'An unexpected error occurred while processing your request. Please try again shortly.',
    });
  },
  unknownCommand(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Command unavailable',
      description: 'That command is no longer available. Use `/help` to view the current list.',
    });
  },
  playerNotFound(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Player not found',
      description:
        'I could not find that profile. Try providing a SteamID64, Steam profile link, or the exact in-game name.',
    });
  },
  linkAccountRequired(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Steam account required',
      description:
        'You have not linked your Steam account yet. Use the `/store` command first, then try again.',
    });
  },
  matchNotFound(matchId: string): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Match not found',
      description: `I could not find match #${matchId}. Double-check the ID and try again.`,
    });
  },
  matchUnavailable(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Match unavailable',
      description: 'I could not determine the latest match for that player.',
    });
  },
  noMatches(label: string): EmbedBuilder {
    return buildErrorEmbed({
      title: 'No matches yet',
      description: `I could not find any matches for **${label}** just yet.`,
    });
  },
  statsRefreshQueued(label: string): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Stats are warming up',
      description: `I do not have cached stats for **${label}** yet. I queued a refresh, so please try again in about a minute.`,
    });
  },
  renderFailed(context: string): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Rendering failed',
      description: `Something went wrong while creating ${context}. Please try again later.`,
    });
  },
  commandHelpUnavailable(commandName: string): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Command not found',
      description: `I couldn't find "/${commandName}". Use "/help" without arguments to list available commands.`,
    });
  },
  invalidSelection(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'Selection invalid',
      description: 'That selection looks invalid. Please choose a valid item and try again.',
    });
  },
  noMemeFound(): EmbedBuilder {
    return buildErrorEmbed({
      title: 'No meme',
      description: 'Failed to find a deadlock meme',
    });
  },
};

export { EmbedResponses };
