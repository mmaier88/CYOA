import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Story, Scene, EndingQuality } from '../api/types';
import { getStory, startPlaythrough, makeDecision, getUserId, getPlaythrough } from '../api/client';

// Storage keys
const PLAYTHROUGH_STORAGE_KEY = 'cyoa_active_playthroughs';

interface SavedPlaythrough {
  jobId: string;
  playthroughId: string;
  savedAt: string;
}

interface PlayerState {
  // Story data
  jobId: string | null;
  story: Story | null;

  // Playthrough data
  playthroughId: string | null;
  currentScene: Scene | null;
  pathTaken: string[];
  isComplete: boolean;
  endingQuality: EndingQuality | null;

  // UI state
  isLoading: boolean;
  isDeciding: boolean;
  error: string | null;

  // Actions
  loadStory: (jobId: string) => Promise<void>;
  startPlay: () => Promise<void>;
  resumePlay: (playthroughId: string) => Promise<void>;
  selectDecision: (decisionId: string) => Promise<void>;
  reset: () => void;
  getSavedPlaythrough: (jobId: string) => SavedPlaythrough | null;
  clearSavedPlaythrough: (jobId: string) => void;
}

// Helper functions for localStorage persistence
function getSavedPlaythroughs(): Record<string, SavedPlaythrough> {
  try {
    const saved = localStorage.getItem(PLAYTHROUGH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function savePlaythrough(jobId: string, playthroughId: string): void {
  try {
    const saved = getSavedPlaythroughs();
    saved[jobId] = {
      jobId,
      playthroughId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(PLAYTHROUGH_STORAGE_KEY, JSON.stringify(saved));
  } catch (err) {
    console.error('[Player] Failed to save playthrough:', err);
  }
}

function removeSavedPlaythrough(jobId: string): void {
  try {
    const saved = getSavedPlaythroughs();
    delete saved[jobId];
    localStorage.setItem(PLAYTHROUGH_STORAGE_KEY, JSON.stringify(saved));
  } catch (err) {
    console.error('[Player] Failed to remove saved playthrough:', err);
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  jobId: null,
  story: null,
  playthroughId: null,
  currentScene: null,
  pathTaken: [],
  isComplete: false,
  endingQuality: null,
  isLoading: false,
  isDeciding: false,
  error: null,

  // Load a story by job ID
  loadStory: async (jobId: string) => {
    set({ isLoading: true, error: null, jobId });

    try {
      const response = await getStory(jobId);

      if (response.status !== 'succeeded' || !response.story) {
        throw new Error('Story not ready or generation failed');
      }

      set({
        story: response.story,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.error || err.message || 'Failed to load story',
      });
      throw err;
    }
  },

  // Start a new playthrough
  startPlay: async () => {
    const { jobId } = get();
    if (!jobId) throw new Error('No story loaded');

    set({ isLoading: true, error: null });

    try {
      const userId = getUserId();
      const response = await startPlaythrough(jobId, userId);

      // Save to localStorage for resume
      savePlaythrough(jobId, response.playthroughId);

      set({
        playthroughId: response.playthroughId,
        currentScene: response.currentScene,
        pathTaken: [response.currentScene.id],
        isComplete: false,
        endingQuality: null,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.error || err.message || 'Failed to start playthrough',
      });
      throw err;
    }
  },

  // Resume an existing playthrough
  resumePlay: async (playthroughId: string) => {
    const { jobId } = get();
    if (!jobId) throw new Error('No story loaded');

    set({ isLoading: true, error: null });

    try {
      const response = await getPlaythrough(jobId, playthroughId);

      set({
        playthroughId: response.playthroughId,
        currentScene: response.currentScene,
        pathTaken: response.pathTaken as string[],
        isComplete: response.isComplete,
        endingQuality: response.currentScene?.endingQuality || null,
        isLoading: false,
      });
    } catch (err: any) {
      // If resume fails, clear the saved playthrough and start fresh
      console.error('[Player] Failed to resume, starting fresh:', err);
      removeSavedPlaythrough(jobId);
      set({ isLoading: false });
      return get().startPlay();
    }
  },

  // Make a decision
  selectDecision: async (decisionId: string) => {
    const { jobId, playthroughId, pathTaken } = get();
    if (!jobId || !playthroughId) throw new Error('No active playthrough');

    set({ isDeciding: true, error: null });

    try {
      const response = await makeDecision(jobId, playthroughId, decisionId);

      // Update saved playthrough timestamp
      savePlaythrough(jobId, playthroughId);

      // Clear saved playthrough if complete
      if (response.isComplete) {
        removeSavedPlaythrough(jobId);
      }

      set({
        currentScene: response.currentScene,
        pathTaken: [...pathTaken, response.currentScene.id],
        isComplete: response.isComplete || false,
        endingQuality: response.endingQuality || null,
        isDeciding: false,
      });
    } catch (err: any) {
      set({
        isDeciding: false,
        error: err.response?.data?.error || err.message || 'Failed to make decision',
      });
      throw err;
    }
  },

  // Get saved playthrough for a story
  getSavedPlaythrough: (jobId: string): SavedPlaythrough | null => {
    const saved = getSavedPlaythroughs();
    return saved[jobId] || null;
  },

  // Clear saved playthrough for a story
  clearSavedPlaythrough: (jobId: string) => {
    removeSavedPlaythrough(jobId);
  },

  // Reset player state
  reset: () => {
    const { jobId } = get();
    if (jobId) {
      removeSavedPlaythrough(jobId);
    }
    set({
      jobId: null,
      story: null,
      playthroughId: null,
      currentScene: null,
      pathTaken: [],
      isComplete: false,
      endingQuality: null,
      isLoading: false,
      isDeciding: false,
      error: null,
    });
  },
}));
