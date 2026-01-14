import axios from 'axios';
import type {
  CreateStoryInput,
  StoryJobResponse,
  PlaythroughResponse,
  PlaythroughStatus,
  StoryListResponse,
} from './types';

// API Configuration - use /api proxy in production to avoid mixed content issues
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'cyoa_DYqDE4hwETu6LsTB0BptOkjdMOqmNRY';

// Axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

/**
 * List all available stories
 */
export async function listStories(): Promise<StoryListResponse> {
  const response = await apiClient.get<StoryListResponse>('/stories');
  return response.data;
}

/**
 * Create a new story generation job
 */
export async function createStory(input: CreateStoryInput): Promise<StoryJobResponse> {
  const response = await apiClient.post<StoryJobResponse>('/stories', input);
  return response.data;
}

/**
 * Get story job status or completed story
 */
export async function getStory(jobId: string): Promise<StoryJobResponse> {
  const response = await apiClient.get<StoryJobResponse>(`/stories/${jobId}`);
  return response.data;
}

/**
 * Start a new playthrough
 */
export async function startPlaythrough(
  storyId: string,
  userId: string
): Promise<PlaythroughResponse> {
  const response = await apiClient.post<PlaythroughResponse>(
    `/stories/${storyId}/play`,
    { userId }
  );
  return response.data;
}

/**
 * Make a decision in a playthrough
 */
export async function makeDecision(
  storyId: string,
  playthroughId: string,
  decisionId: string
): Promise<PlaythroughResponse> {
  const response = await apiClient.post<PlaythroughResponse>(
    `/stories/${storyId}/play/${playthroughId}/decide`,
    { decisionId }
  );
  return response.data;
}

/**
 * Get playthrough status
 */
export async function getPlaythrough(
  storyId: string,
  playthroughId: string
): Promise<PlaythroughStatus> {
  const response = await apiClient.get<PlaythroughStatus>(
    `/stories/${storyId}/play/${playthroughId}`
  );
  return response.data;
}

/**
 * Generate a persistent anonymous user ID
 */
const USER_ID_KEY = 'cyoa_user_id';

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
