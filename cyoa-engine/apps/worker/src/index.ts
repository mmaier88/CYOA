import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import {
  createLLMClient,
  CYOAOrchestrator,
  createStoryGenerationState,
  StoryGenerationState,
  Genre,
  Tone,
  Difficulty,
  StoryPreset
} from '@chronicle/core';

// Initialize Prisma
const prisma = new PrismaClient();

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Queue name with optional prefix for staging
const QUEUE_NAME = process.env.QUEUE_PREFIX
  ? `${process.env.QUEUE_PREFIX}cyoa-stories`
  : 'cyoa-stories';

/**
 * Story generation job input
 */
interface StoryJobInput {
  genre: Genre;
  tone: Tone;
  difficulty: Difficulty;
  preset: StoryPreset;
  premise: string;
  player_name: string;
  player_gender?: 'male' | 'female' | 'neutral';
  player_personality?: string;
  mode?: 'draft' | 'polished';
}

/**
 * Job data structure
 */
interface GenerateStoryJobData {
  jobId: string;
  input: StoryJobInput;
}

/**
 * Update job progress in database
 */
async function updateJobProgress(jobId: string, progress: number, message: string): Promise<void> {
  await prisma.storyJob.update({
    where: { id: jobId },
    data: {
      progress,
      message,
      status: progress >= 100 ? 'succeeded' : 'running'
    }
  });
}

/**
 * Generate a title from the story state
 */
function generateTitle(state: StoryGenerationState): string {
  const setting = state.world_rules?.setting || state.premise;
  const words = setting.split(' ').slice(0, 5);
  return words.join(' ') + (words.length >= 5 ? '...' : '');
}

/**
 * Count endings in the story
 */
function countEndings(state: StoryGenerationState): number {
  return Object.values(state.scenes).filter(s => s.is_ending).length;
}

/**
 * Process a story generation job
 */
async function processStoryJob(job: Job<GenerateStoryJobData>): Promise<void> {
  const { jobId, input } = job.data;

  console.log(`[${jobId}] Starting story generation`, {
    genre: input.genre,
    preset: input.preset,
    tone: input.tone
  });

  try {
    // Mark job as running
    await prisma.storyJob.update({
      where: { id: jobId },
      data: { status: 'running', message: 'Starting generation...' }
    });

    // Create initial state
    const state = createStoryGenerationState({
      genre: input.genre,
      tone: input.tone,
      difficulty: input.difficulty,
      preset: input.preset,
      premise: input.premise,
      player: {
        name: input.player_name,
        gender: input.player_gender || 'neutral',
        personality: input.player_personality
      }
    });

    // Create orchestrator with LLM client
    const llm = createLLMClient();
    const orchestrator = new CYOAOrchestrator(
      llm,
      jobId,
      (progress, message) => updateJobProgress(jobId, progress, message)
    );

    // Run generation
    const finalState = await orchestrator.run(state, input.mode || 'draft');

    console.log(`[${jobId}] Story generation complete`, {
      scenes: Object.keys(finalState.scenes).length,
      endings: countEndings(finalState)
    });

    // Save the completed story
    const story = await prisma.story.create({
      data: {
        title: generateTitle(finalState),
        genre: input.genre,
        premise: input.premise,
        worldRules: finalState.world_rules as any,
        tone: input.tone,
        difficulty: input.difficulty,
        totalScenes: Object.keys(finalState.scenes).length,
        totalEndings: countEndings(finalState),
        isPublic: false
      }
    });

    // Map scene IDs to database IDs
    const sceneIdMap: Record<string, string> = {};

    // Save all scenes (first pass - without decisions)
    for (const [sceneId, scene] of Object.entries(finalState.scenes)) {
      const dbScene = await prisma.scene.create({
        data: {
          storyId: story.id,
          sceneType: scene.scene_type,
          content: scene.content,
          characterState: scene.character_state_changes as any,
          sceneOrder: scene.level * 100 + parseInt(sceneId.split('_')[2] || '0'),
          isEnding: scene.is_ending,
          endingQuality: scene.ending_quality,
          endingSummary: scene.ending_summary
        }
      });
      sceneIdMap[sceneId] = dbScene.id;
    }

    // Save decisions (second pass - with proper scene references)
    for (const [sceneId, scene] of Object.entries(finalState.scenes)) {
      const dbSceneId = sceneIdMap[sceneId];
      if (!dbSceneId) continue;

      for (const decision of scene.decisions) {
        const nextDbSceneId = sceneIdMap[decision.leads_to];

        await prisma.decision.create({
          data: {
            sceneId: dbSceneId,
            text: decision.text,
            consequenceHint: decision.consequence_hint,
            nextSceneId: nextDbSceneId || null,
            choiceOrder: decision.choice_order
          }
        });
      }
    }

    // Update job with completed story reference
    await prisma.storyJob.update({
      where: { id: jobId },
      data: {
        status: 'succeeded',
        progress: 100,
        message: 'Story complete!',
        storyId: story.id
      }
    });

    console.log(`[${jobId}] Saved story: ${story.id}`);

  } catch (error) {
    console.error(`[${jobId}] Story generation failed`, error);

    // Mark job as failed
    await prisma.storyJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  }
}

/**
 * Create and start the worker
 */
async function main() {
  console.log('CYOA Worker starting...');

  // Verify PostgreSQL connection
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }

  // Create worker
  const worker = new Worker<GenerateStoryJobData>(
    QUEUE_NAME,
    processStoryJob,
    {
      connection: redisConnection,
      concurrency: 2, // Two stories at a time
      lockDuration: 120000, // 2 minutes
      stalledInterval: 30000 // Check for stalled jobs every 30 seconds
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[${job.data.jobId}] Job completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[${job?.data.jobId}] Job failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('ready', () => {
    console.log(`Connected to Redis, listening on queue: ${QUEUE_NAME}`);
  });

  console.log('CYOA Worker ready, waiting for jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Worker startup failed:', error);
  process.exit(1);
});
