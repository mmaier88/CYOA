import { create } from 'zustand';
import type { Story, Scene, EndingQuality } from '../api/types';
import { getStory, startPlaythrough, makeDecision, getUserId } from '../api/client';

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
  selectDecision: (decisionId: string) => Promise<void>;
  reset: () => void;
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

  // Make a decision
  selectDecision: async (decisionId: string) => {
    const { jobId, playthroughId, pathTaken } = get();
    if (!jobId || !playthroughId) throw new Error('No active playthrough');

    set({ isDeciding: true, error: null });

    try {
      const response = await makeDecision(jobId, playthroughId, decisionId);

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

  // Reset player state
  reset: () => set({
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
  }),
}));
