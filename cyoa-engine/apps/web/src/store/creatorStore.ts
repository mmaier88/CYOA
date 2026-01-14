import { create } from 'zustand';
import type { Genre, Tone, Difficulty, Preset, JobStatus } from '../api/types';
import { createStory, getStory } from '../api/client';

type WizardStep = 'genre' | 'details' | 'premise' | 'player' | 'generating';

interface CreatorState {
  // Wizard navigation
  currentStep: WizardStep;

  // Story configuration
  genre: Genre | null;
  tone: Tone;
  difficulty: Difficulty;
  preset: Preset;
  premise: string;
  playerName: string;
  playerGender: 'male' | 'female' | 'neutral';
  playerPersonality: string;

  // Generation state
  jobId: string | null;
  status: JobStatus | 'idle';
  progress: number;
  message: string;
  error: string | null;

  // Actions
  setGenre: (genre: Genre) => void;
  setTone: (tone: Tone) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setPreset: (preset: Preset) => void;
  setPremise: (premise: string) => void;
  setPlayerName: (name: string) => void;
  setPlayerGender: (gender: 'male' | 'female' | 'neutral') => void;
  setPlayerPersonality: (personality: string) => void;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: WizardStep) => void;

  submitStory: () => Promise<string>;
  pollStatus: () => Promise<boolean>;
  reset: () => void;
}

const STEP_ORDER: WizardStep[] = ['genre', 'details', 'premise', 'player', 'generating'];

export const useCreatorStore = create<CreatorState>((set, get) => ({
  // Initial state
  currentStep: 'genre',
  genre: null,
  tone: 'balanced',
  difficulty: 'normal',
  preset: 'quick',
  premise: '',
  playerName: '',
  playerGender: 'male',
  playerPersonality: '',
  jobId: null,
  status: 'idle',
  progress: 0,
  message: '',
  error: null,

  // Setters
  setGenre: (genre) => set({ genre }),
  setTone: (tone) => set({ tone }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setPreset: (preset) => set({ preset }),
  setPremise: (premise) => set({ premise }),
  setPlayerName: (name) => set({ playerName: name }),
  setPlayerGender: (gender) => set({ playerGender: gender }),
  setPlayerPersonality: (personality) => set({ playerPersonality: personality }),

  // Navigation
  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1] });
    }
  },

  goToStep: (step) => set({ currentStep: step }),

  // Submit story for generation
  submitStory: async () => {
    const state = get();

    if (!state.genre || !state.premise || !state.playerName) {
      throw new Error('Missing required fields');
    }

    set({ status: 'queued', progress: 0, message: 'Creating story...', error: null });

    try {
      const response = await createStory({
        genre: state.genre,
        tone: state.tone,
        difficulty: state.difficulty,
        preset: state.preset,
        premise: state.premise,
        player_name: state.playerName,
        player_gender: state.playerGender,
        player_personality: state.playerPersonality || undefined,
      });

      set({
        jobId: response.id,
        status: response.status,
        progress: response.progress,
        message: response.message,
      });

      return response.id;
    } catch (err: any) {
      set({
        status: 'failed',
        error: err.response?.data?.error || err.message || 'Failed to create story',
      });
      throw err;
    }
  },

  // Poll for status updates
  pollStatus: async () => {
    const { jobId } = get();
    if (!jobId) return false;

    try {
      const response = await getStory(jobId);

      set({
        status: response.status,
        progress: response.progress,
        message: response.message,
        error: response.error || null,
      });

      // Return true if generation is complete
      return response.status === 'succeeded' || response.status === 'failed';
    } catch (err: any) {
      set({
        status: 'failed',
        error: err.message || 'Failed to check status',
      });
      return true; // Stop polling on error
    }
  },

  // Reset to initial state
  reset: () => set({
    currentStep: 'genre',
    genre: null,
    tone: 'balanced',
    difficulty: 'normal',
    preset: 'quick',
    premise: '',
    playerName: '',
    playerGender: 'male',
    playerPersonality: '',
    jobId: null,
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
  }),
}));
