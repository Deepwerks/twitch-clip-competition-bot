import axios from 'axios';
import { config } from '../../core/config';
import {
  ClipCreator,
  ClipsResponse,
  TwitchClip,
  TwitchVideo,
  TwitchVideoResponse,
  VodClipData,
} from './interfaces';
import { logger } from '../../libs/logger';

export class TwitchVodAnalizer {
  private twitchOauthUrl: string = 'https://id.twitch.tv/oauth2/token';
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  async fetchVodClipData(vodUrl: string): Promise<VodClipData | null> {
    try {
      const vodId = this.extractVodId(vodUrl);
      const token = await this.getAccessToken();

      if (!token) {
        throw new Error('Failed to get twitch access token');
      }

      const vod = await this.getVodInfo(vodId, token);
      const broadcasterId = vod.user_id;

      const headers = {
        'Client-Id': config.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      };

      const clips: TwitchClip[] = [];
      let cursor: string | undefined;
      do {
        const params: Record<string, string | number> = {
          broadcaster_id: broadcasterId,
          first: 100,
        };

        if (cursor) {
          params.after = cursor;
        }

        const response = await axios.get<ClipsResponse>(`${config.TWITCH_CLIENT_BASE_URL}/clips`, {
          headers,
          params,
        });

        const data = response.data;

        // Filter clips belonging to the requested VOD
        const vodClips = data.data.filter((clip) => clip.video_id === vodId);

        clips.push(...vodClips);

        cursor = data.pagination.cursor;
      } while (cursor);

      // Get unique clip creators
      const creatorsMap = new Map<string, ClipCreator>();

      for (const clip of clips) {
        const existing = creatorsMap.get(clip.creator_id);

        if (existing) {
          existing.total_clip_views += clip.view_count;
          existing.total_clips += 1;
        } else {
          creatorsMap.set(clip.creator_id, {
            clip_creator_id: clip.creator_id,
            clip_creator_name: clip.creator_name,
            total_clip_views: clip.view_count,
            total_clips: 1,
          });
        }
      }

      // Sum all clip views
      const totalClipViews = clips.reduce((total, clip) => total + clip.view_count, 0);

      return {
        vod_id: vodId,
        vod_title: vod.title,
        broadcaster_id: vod.user_id,
        broadcaster_name: vod.user_name,
        clip_creators: Array.from(creatorsMap.values()),
        total_clip_views: totalClipViews,
        total_clips: clips.length,
      };
    } catch (error) {
      logger.app.error('Failed to fetch twitch clips', { error });
      return null;
    }
  }

  private async getVodInfo(vodId: string, token: string): Promise<TwitchVideo> {
    const response = await axios.get<TwitchVideoResponse>(
      `${config.TWITCH_CLIENT_BASE_URL}/videos`,
      {
        headers: {
          'Client-Id': config.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
        params: {
          id: vodId,
        },
      }
    );

    const video = response.data.data[0];

    if (!video) {
      throw new Error(`Twitch VOD "${vodId}" not found`);
    }

    return video;
  }

  private async getBroadcasterId(username: string, token: string) {
    const response = await axios.get(`${config.TWITCH_CLIENT_BASE_URL}/users`, {
      headers: {
        'Client-Id': config.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
      params: {
        login: username,
      },
    });

    const user = response.data.data[0];

    if (!user) {
      throw new Error(`Twitch user "${username}" not found`);
    }

    return user.id;
  }

  private async getAccessToken() {
    // Reuse token if it is still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await axios.post(this.twitchOauthUrl, null, {
      params: {
        client_id: config.TWITCH_CLIENT_ID,
        client_secret: config.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });

    this.accessToken = response.data.access_token;

    // Refresh 60 seconds before expiration
    this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  private extractVodId(vodUrl: string) {
    const match = vodUrl.match(/\/videos\/(\d+)/);

    if (!match) {
      throw new Error('Invalid Twitch VOD URL');
    }

    return match[1];
  }
}
