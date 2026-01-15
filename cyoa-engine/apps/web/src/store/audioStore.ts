import { create } from 'zustand';
import type { AudioCache, PlaybackSpeed } from '../lib/audio/types';
import { PLAYBACK_SPEEDS } from '../lib/audio/types';

interface AudioState {
  // Story & Content
  storyId: string | null;
  storyTitle: string;
  currentSceneId: string | null;

  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // seconds into current scene
  duration: number; // duration of current scene audio
  playbackRate: PlaybackSpeed;

  // Player UI state
  isVisible: boolean;

  // Audio cache
  audioCache: AudioCache;

  // Audio element reference
  audioRef: HTMLAudioElement | null;
}

interface AudioActions {
  // Setup
  setAudioRef: (ref: HTMLAudioElement | null) => void;

  // Story loading
  loadStory: (storyId: string, title: string) => void;

  // Scene audio
  playScene: (sceneId: string) => Promise<void>;
  fetchSceneAudio: (sceneId: string) => Promise<{ url: string; duration: number } | null>;

  // Playback controls
  play: () => Promise<void>;
  pause: () => void;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;

  // Settings
  setPlaybackRate: (rate: PlaybackSpeed) => void;
  cyclePlaybackRate: () => void;

  // Cleanup
  close: () => void;

  // Internal
  updateProgress: (seconds: number) => void;
  updateDuration: (seconds: number) => void;
  handleEnded: () => void;
}

type AudioStore = AudioState & AudioActions;

// API base URL
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
  storyId: null,
  storyTitle: '',
  currentSceneId: null,
  isPlaying: false,
  isLoading: false,
  progress: 0,
  duration: 0,
  playbackRate: 1,
  isVisible: false,
  audioCache: {},
  audioRef: null,

  // Setup
  setAudioRef: (ref) => set({ audioRef: ref }),

  // Load a story into the player
  loadStory: (storyId, title) => {
    set({
      storyId,
      storyTitle: title,
      isVisible: false,
      audioCache: {},
      currentSceneId: null,
      progress: 0,
      duration: 0,
    });
  },

  // Fetch audio for a scene
  fetchSceneAudio: async (sceneId) => {
    const { audioCache, storyId } = get();

    if (!storyId) {
      console.error('[Audio] No story loaded');
      return null;
    }

    // Check cache first
    const cached = audioCache[sceneId];
    if (cached?.status === 'ready' && cached.url) {
      return { url: cached.url, duration: cached.duration };
    }

    // Mark as loading
    set((state) => ({
      audioCache: {
        ...state.audioCache,
        [sceneId]: { url: '', duration: 0, status: 'loading' },
      },
    }));

    try {
      // Request TTS generation/fetch
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/stories/${storyId}/scenes/${sceneId}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_API_KEY || 'cyoa_DYqDE4hwETu6LsTB0BptOkjdMOqmNRY',
        },
      });

      const data = await response.json();

      // Handle unavailable TTS (no API key configured)
      if (data.status === 'unavailable') {
        console.log('[Audio] TTS not configured on server');
        set((state) => ({
          audioCache: {
            ...state.audioCache,
            [sceneId]: { url: '', duration: data.duration_seconds || 0, status: 'error' },
          },
        }));
        return null;
      }

      if (data.status === 'generating' || data.status === 'pending') {
        // Poll for completion
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return get().fetchSceneAudio(sceneId);
      }

      if (data.status === 'ready' && data.audio_url) {
        // Build full URL for audio endpoint
        const audioUrl = data.audio_url.startsWith('/')
          ? `${apiBase}${data.audio_url}`
          : data.audio_url;

        // Fetch audio as blob to avoid CORS issues
        const audioResponse = await fetch(audioUrl, {
          headers: {
            'X-API-Key': import.meta.env.VITE_API_KEY || 'cyoa_DYqDE4hwETu6LsTB0BptOkjdMOqmNRY',
          },
        });
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }

        const audioBlob = await audioResponse.blob();
        const blobUrl = URL.createObjectURL(
          audioBlob.type === 'audio/mpeg' ? audioBlob : new Blob([audioBlob], { type: 'audio/mpeg' })
        );

        set((state) => ({
          audioCache: {
            ...state.audioCache,
            [sceneId]: { url: blobUrl, duration: data.duration_seconds || 0, status: 'ready' },
          },
        }));

        return { url: blobUrl, duration: data.duration_seconds || 0 };
      }

      throw new Error(`Audio not ready: ${data.status || 'unknown'}`);
    } catch (err) {
      console.error('[Audio] fetchSceneAudio error:', err);
      set((state) => ({
        audioCache: {
          ...state.audioCache,
          [sceneId]: { url: '', duration: 0, status: 'error' },
        },
      }));
      return null;
    }
  },

  // Play a specific scene
  playScene: async (sceneId) => {
    const { audioRef, fetchSceneAudio, playbackRate } = get();

    set({
      currentSceneId: sceneId,
      isLoading: true,
      isVisible: true,
      progress: 0,
    });

    const audio = await fetchSceneAudio(sceneId);

    if (audio && audioRef) {
      audioRef.src = audio.url;
      audioRef.playbackRate = playbackRate;
      set({ duration: audio.duration, isLoading: false });

      try {
        await audioRef.play();
        set({ isPlaying: true });
      } catch (err) {
        console.error('[Audio] Playback failed:', err);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  // Playback controls
  play: async () => {
    const { audioRef, currentSceneId, fetchSceneAudio, playbackRate } = get();

    if (!audioRef) {
      console.error('[Audio] No audio ref');
      return;
    }

    if (!currentSceneId) {
      console.error('[Audio] No scene selected');
      return;
    }

    // Check if we need to load audio
    if (!audioRef.src || audioRef.src === window.location.href) {
      set({ isLoading: true });
      const audio = await fetchSceneAudio(currentSceneId);

      if (audio) {
        audioRef.src = audio.url;
        audioRef.playbackRate = playbackRate;
        set({ duration: audio.duration });
      }
      set({ isLoading: false });
    }

    try {
      await audioRef.play();
      set({ isPlaying: true });
    } catch (err) {
      console.error('[Audio] Play failed:', err);
    }
  },

  pause: () => {
    const { audioRef } = get();
    if (audioRef) {
      audioRef.pause();
      set({ isPlaying: false });
    }
  },

  togglePlayPause: async () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  },

  seekTo: (seconds) => {
    const { audioRef, duration } = get();
    if (audioRef) {
      const clampedTime = Math.max(0, Math.min(seconds, duration));
      audioRef.currentTime = clampedTime;
      set({ progress: clampedTime });
    }
  },

  skipForward: (seconds = 15) => {
    const { progress, duration, seekTo } = get();
    seekTo(Math.min(progress + seconds, duration));
  },

  skipBackward: (seconds = 15) => {
    const { progress, seekTo } = get();
    seekTo(Math.max(progress - seconds, 0));
  },

  // Settings
  setPlaybackRate: (rate) => {
    const { audioRef } = get();
    set({ playbackRate: rate });
    if (audioRef) {
      audioRef.playbackRate = rate;
    }
  },

  cyclePlaybackRate: () => {
    const { playbackRate, setPlaybackRate } = get();
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackRate(PLAYBACK_SPEEDS[nextIndex]);
  },

  // Cleanup
  close: () => {
    const { audioRef } = get();
    if (audioRef) {
      audioRef.pause();
      audioRef.src = '';
    }
    set({
      isVisible: false,
      isPlaying: false,
      currentSceneId: null,
      progress: 0,
      duration: 0,
    });
  },

  // Internal updates
  updateProgress: (seconds) => set({ progress: seconds }),
  updateDuration: (seconds) => set({ duration: seconds }),

  handleEnded: () => {
    set({ isPlaying: false });
  },
}));
