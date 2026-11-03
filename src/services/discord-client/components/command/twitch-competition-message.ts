import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js';

import type { VodClipData } from '../../../twitch-clips/interfaces';

export interface TwitchCompetitionMessageOptions {
  vod: VodClipData;
  description: string;
  vodUrl: string;
  endsAt: Date;
  bannerUrl?: string;
  notifiedRoleId?: string;
}

export function buildTwitchCompetitionMessage(
  options: TwitchCompetitionMessageOptions
): ContainerBuilder {
  const { vod, description, vodUrl, endsAt, bannerUrl, notifiedRoleId } = options;

  const topClippers = [...vod.clip_creators]
    .sort((a, b) => b.total_clip_views - a.total_clip_views)
    .slice(0, 5);

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

  const container = new ContainerBuilder().setAccentColor(0x9146ff);

  const endTimestamp = Math.floor(endsAt.getTime() / 1000);
  const lastUpdated = Math.floor(Date.now() / 1000);

  if (bannerUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Competition banner')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '# 🏆 Twitch Clip Competition',
        description,
        '',
        `**Ends:** <t:${endTimestamp}:R>`,
        `**VOD:** [${vod.vod_title}](${vodUrl})`,
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  const leaderboard = topClippers.length
    ? topClippers
        .map((clipper, index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const twitchUrl = `https://www.twitch.tv/${encodeURIComponent(
            clipper.clip_creator_name
          )}`;

          return [
            `${medals[index] ?? `**${index + 1}.**`} **[${clipper.clip_creator_name}](${twitchUrl})**`,
            `↳ ${formatNumber(clipper.total_clip_views)} views · ${formatNumber(clipper.total_clips)} clips`,
          ].join('\n');
        })
        .join('\n\n')
    : '*No clips found for this VOD yet.*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 🎬 Top 5 Clippers\n\n${leaderboard}`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Total Clips:** ${formatNumber(vod.total_clips)}`,
        `**Total Clip Views:** ${formatNumber(vod.total_clip_views)}`,
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${notifiedRoleId ? `<@&${notifiedRoleId}> ` : ''}🕒 Last updated: <t:${lastUpdated}:R>`
    )
  );

  return container;
}
