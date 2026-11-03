export interface TwitchClip {
  id: string;
  video_id: string;
  creator_id: string;
  creator_name: string;
  view_count: number;
}

export interface ClipsResponse {
  data: TwitchClip[];
  pagination: {
    cursor?: string;
  };
}

export interface ClipCreator {
  clip_creator_id: string;
  clip_creator_name: string;
  total_clip_views: number;
  total_clips: number;
}

export interface VodClipData {
  vod_id: string;
  vod_title: string;
  broadcaster_id: string;
  broadcaster_name: string;
  clip_creators: ClipCreator[];
  total_clip_views: number;
  total_clips: number;
}

export interface TwitchVideo {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
}

export interface TwitchVideoResponse {
  data: TwitchVideo[];
}
