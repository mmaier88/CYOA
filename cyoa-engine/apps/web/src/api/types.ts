// API Types for CYOA Engine

export type Genre = 'fantasy' | 'mystery' | 'scifi' | 'romance' | 'horror';
export type Tone = 'light' | 'balanced' | 'dark';
export type Difficulty = 'forgiving' | 'normal' | 'punishing';
export type Preset = 'quick' | 'standard' | 'epic';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type SceneType = 'intro' | 'branch' | 'consequence' | 'ending';
export type EndingQuality = 'bad' | 'neutral' | 'good' | 'best' | 'secret';

export interface CreateStoryInput {
  genre: Genre;
  tone?: Tone;
  difficulty?: Difficulty;
  preset?: Preset;
  premise: string;
  player_name: string;
  player_gender?: 'male' | 'female' | 'neutral';
  player_personality?: string;
}

export interface StoryJobResponse {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  error?: string;
  createdAt: string;
  story?: Story;
}

export interface Story {
  id: string;
  title: string;
  genre: Genre;
  premise: string;
  tone: Tone;
  difficulty: Difficulty;
  worldRules: WorldRules;
  totalScenes: number;
  totalEndings: number;
  scenes: Scene[];
}

export interface WorldRules {
  setting: string;
  key_characters: { name: string; role: string; relationship_to_player: string }[];
  rules: string[];
  possible_endings: { quality: EndingQuality; condition: string; summary: string }[];
}

export interface Scene {
  id: string;
  sceneType: SceneType;
  content: string;
  sceneOrder: number;
  isEnding: boolean;
  endingQuality?: EndingQuality;
  endingSummary?: string;
  decisions: Decision[];
}

export interface Decision {
  id: string;
  text: string;
  consequenceHint?: string;
  nextSceneId: string;
  choiceOrder: number;
  timesChosen: number;
}

export interface PlaythroughResponse {
  playthroughId: string;
  currentScene: Scene;
  isComplete?: boolean;
  endingQuality?: EndingQuality;
}

export interface PlaythroughStatus {
  playthroughId: string;
  storyId: string;
  userId: string;
  currentScene: Scene;
  pathTaken: string[];
  decisionsMade: string[];
  isComplete: boolean;
  endingSceneId?: string;
  durationSeconds?: number;
}

export interface StoryListItem {
  id: string;
  jobId: string;
  title: string;
  genre: Genre;
  premise: string;
  tone: Tone;
  difficulty: Difficulty;
  totalScenes: number;
  totalEndings: number;
  playerName?: string;
  createdAt: string;
}

export interface StoryListResponse {
  stories: StoryListItem[];
}
