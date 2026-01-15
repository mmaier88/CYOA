// Audio types for CYOA story player

export interface AudioScene {
  id: string;
  title: string;
  sceneOrder: number;
}

export interface AudioCache {
  [sceneId: string]: {
    url: string;
    duration: number;
    status: 'loading' | 'ready' | 'error';
  };
}

export interface SavedAudioProgress {
  sceneId: string;
  offsetMs: number;
  playbackSpeed: number;
}

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
