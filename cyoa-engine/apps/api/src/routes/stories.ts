import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const router = Router();
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

const storyQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/**
 * GET /v1/stories
 * List all completed stories
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, offset = 0, genre } = req.query;

    const where: any = {};
    if (genre) where.genre = genre;

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        title: true,
        genre: true,
        premise: true,
        tone: true,
        difficulty: true,
        totalScenes: true,
        totalEndings: true,
        coverUrl: true,
        createdAt: true
      }
    });

    // Get job IDs for each story
    const storyIds = stories.map(s => s.id);
    const jobs = await prisma.storyJob.findMany({
      where: { storyId: { in: storyIds } },
      select: { id: true, storyId: true, input: true }
    });

    const jobMap = new Map(jobs.map(j => [j.storyId, j]));

    const storiesWithJobId = stories.map(s => {
      const job = jobMap.get(s.id);
      const input = job?.input as any;
      return {
        ...s,
        jobId: job?.id,
        playerName: input?.player_name
      };
    });

    res.json({ stories: storiesWithJobId });
  } catch (error) {
    console.error('Failed to list stories:', error);
    res.status(500).json({ error: 'Failed to list stories' });
  }
});

/**
 * POST /v1/stories
 * Create a new story generation job
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      genre,
      tone = 'balanced',
      difficulty = 'normal',
      preset = 'quick',
      premise,
      player_name,
      player_gender = 'neutral',
      player_personality,
      mode = 'draft'
    } = req.body;

    // Validate required fields
    if (!genre || !premise || !player_name) {
      res.status(400).json({
        error: 'Missing required fields: genre, premise, player_name'
      });
      return;
    }

    // Validate genre
    const validGenres = ['fantasy', 'mystery', 'scifi', 'romance', 'horror'];
    if (!validGenres.includes(genre)) {
      res.status(400).json({
        error: `Invalid genre. Must be one of: ${validGenres.join(', ')}`
      });
      return;
    }

    // Validate preset
    const validPresets = ['quick', 'standard', 'epic'];
    if (!validPresets.includes(preset)) {
      res.status(400).json({
        error: `Invalid preset. Must be one of: ${validPresets.join(', ')}`
      });
      return;
    }

    // Create job record
    const job = await prisma.storyJob.create({
      data: {
        input: {
          genre,
          tone,
          difficulty,
          preset,
          premise,
          player_name,
          player_gender,
          player_personality,
          mode
        },
        status: 'queued',
        message: 'Waiting to start...'
      }
    });

    // Add to queue
    await storyQueue.add('generate', {
      jobId: job.id,
      input: {
        genre,
        tone,
        difficulty,
        preset,
        premise,
        player_name,
        player_gender,
        player_personality,
        mode
      }
    });

    console.log(`[${job.id}] Story job created`, { genre, preset, mode });

    res.status(201).json({
      id: job.id,
      status: job.status,
      message: job.message,
      createdAt: job.createdAt
    });
  } catch (error) {
    console.error('Failed to create story job:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

/**
 * GET /v1/stories/:id
 * Get story job status or completed story
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const job = await prisma.storyJob.findUnique({
      where: { id },
      include: {
        story: {
          include: {
            scenes: {
              orderBy: { sceneOrder: 'asc' },
              include: {
                decisions: {
                  orderBy: { choiceOrder: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!job) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    // If job is complete, return full story
    if (job.status === 'succeeded' && job.story) {
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        story: {
          id: job.story.id,
          title: job.story.title,
          genre: job.story.genre,
          premise: job.story.premise,
          tone: job.story.tone,
          difficulty: job.story.difficulty,
          worldRules: job.story.worldRules,
          totalScenes: job.story.totalScenes,
          totalEndings: job.story.totalEndings,
          scenes: job.story.scenes
        }
      });
      return;
    }

    // Return job status
    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (error) {
    console.error('Failed to get story:', error);
    res.status(500).json({ error: 'Failed to get story' });
  }
});

/**
 * GET /v1/stories/:id/scenes/:sceneId
 * Get a specific scene with its decisions
 */
router.get('/:id/scenes/:sceneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, sceneId } = req.params;

    // Verify the story job exists and is complete
    const job = await prisma.storyJob.findUnique({
      where: { id }
    });

    if (!job || job.status !== 'succeeded' || !job.storyId) {
      res.status(404).json({ error: 'Story not found or not complete' });
      return;
    }

    const scene = await prisma.scene.findFirst({
      where: {
        id: sceneId,
        storyId: job.storyId
      },
      include: {
        decisions: {
          orderBy: { choiceOrder: 'asc' }
        }
      }
    });

    if (!scene) {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }

    res.json(scene);
  } catch (error) {
    console.error('Failed to get scene:', error);
    res.status(500).json({ error: 'Failed to get scene' });
  }
});

/**
 * POST /v1/stories/:id/play
 * Start a new playthrough
 */
router.post('/:id/play', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'Missing required field: userId' });
      return;
    }

    const job = await prisma.storyJob.findUnique({
      where: { id }
    });

    if (!job || job.status !== 'succeeded' || !job.storyId) {
      res.status(404).json({ error: 'Story not found or not complete' });
      return;
    }

    // Find the intro scene
    const introScene = await prisma.scene.findFirst({
      where: {
        storyId: job.storyId,
        sceneType: 'intro'
      },
      include: {
        decisions: {
          orderBy: { choiceOrder: 'asc' }
        }
      }
    });

    if (!introScene) {
      res.status(500).json({ error: 'Story has no intro scene' });
      return;
    }

    // Create playthrough
    const playthrough = await prisma.playthrough.create({
      data: {
        userId,
        storyId: job.storyId,
        currentSceneId: introScene.id,
        pathTaken: [introScene.id],
        decisionsMade: []
      }
    });

    res.status(201).json({
      playthroughId: playthrough.id,
      currentScene: introScene
    });
  } catch (error) {
    console.error('Failed to start playthrough:', error);
    res.status(500).json({ error: 'Failed to start playthrough' });
  }
});

/**
 * POST /v1/stories/:id/play/:playthroughId/decide
 * Make a decision in a playthrough
 */
router.post('/:id/play/:playthroughId/decide', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, playthroughId } = req.params;
    const { decisionId } = req.body;

    if (!decisionId) {
      res.status(400).json({ error: 'Missing required field: decisionId' });
      return;
    }

    // Get the job to find the actual story ID
    const job = await prisma.storyJob.findUnique({ where: { id } });
    if (!job || !job.storyId) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const playthrough = await prisma.playthrough.findUnique({
      where: { id: playthroughId }
    });

    if (!playthrough || playthrough.storyId !== job.storyId) {
      res.status(404).json({ error: 'Playthrough not found' });
      return;
    }

    if (playthrough.completedAt) {
      res.status(400).json({ error: 'Playthrough already completed' });
      return;
    }

    // Get the decision and validate it belongs to current scene
    const decision = await prisma.decision.findUnique({
      where: { id: decisionId }
    });

    if (!decision || decision.sceneId !== playthrough.currentSceneId) {
      res.status(400).json({ error: 'Invalid decision for current scene' });
      return;
    }

    if (!decision.nextSceneId) {
      res.status(500).json({ error: 'Decision has no next scene' });
      return;
    }

    // Get the next scene
    const nextScene = await prisma.scene.findUnique({
      where: { id: decision.nextSceneId },
      include: {
        decisions: {
          orderBy: { choiceOrder: 'asc' }
        }
      }
    });

    if (!nextScene) {
      res.status(500).json({ error: 'Next scene not found' });
      return;
    }

    // Update playthrough
    const pathTaken = playthrough.pathTaken as string[];
    const decisionsMade = playthrough.decisionsMade as string[];

    const updateData: any = {
      currentSceneId: nextScene.id,
      pathTaken: [...pathTaken, nextScene.id],
      decisionsMade: [...decisionsMade, decisionId]
    };

    // Check if this is an ending
    if (nextScene.isEnding) {
      updateData.endingSceneId = nextScene.id;
      updateData.completedAt = new Date();
      updateData.durationSeconds = Math.floor(
        (new Date().getTime() - playthrough.createdAt.getTime()) / 1000
      );
    }

    const updatedPlaythrough = await prisma.playthrough.update({
      where: { id: playthroughId },
      data: updateData
    });

    // Increment decision count
    await prisma.decision.update({
      where: { id: decisionId },
      data: { timesChosen: { increment: 1 } }
    });

    res.json({
      playthroughId: updatedPlaythrough.id,
      currentScene: nextScene,
      isComplete: nextScene.isEnding,
      endingQuality: nextScene.endingQuality
    });
  } catch (error) {
    console.error('Failed to process decision:', error);
    res.status(500).json({ error: 'Failed to process decision' });
  }
});

/**
 * GET /v1/stories/:id/play/:playthroughId
 * Get playthrough status
 */
router.get('/:id/play/:playthroughId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, playthroughId } = req.params;

    // Get the job to find the actual story ID
    const job = await prisma.storyJob.findUnique({ where: { id } });
    if (!job || !job.storyId) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const playthrough = await prisma.playthrough.findUnique({
      where: { id: playthroughId }
    });

    if (!playthrough || playthrough.storyId !== job.storyId) {
      res.status(404).json({ error: 'Playthrough not found' });
      return;
    }

    // Get current scene
    const currentScene = playthrough.currentSceneId
      ? await prisma.scene.findUnique({
          where: { id: playthrough.currentSceneId },
          include: {
            decisions: {
              orderBy: { choiceOrder: 'asc' }
            }
          }
        })
      : null;

    res.json({
      playthroughId: playthrough.id,
      storyId: playthrough.storyId,
      userId: playthrough.userId,
      currentScene,
      pathTaken: playthrough.pathTaken,
      decisionsMade: playthrough.decisionsMade,
      isComplete: !!playthrough.completedAt,
      endingSceneId: playthrough.endingSceneId,
      durationSeconds: playthrough.durationSeconds
    });
  } catch (error) {
    console.error('Failed to get playthrough:', error);
    res.status(500).json({ error: 'Failed to get playthrough' });
  }
});

/**
 * GET /v1/stories/public
 * List public stories
 */
router.get('/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, offset = 0, genre } = req.query;

    const where: any = { isPublic: true };
    if (genre) where.genre = genre;

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        title: true,
        genre: true,
        premise: true,
        tone: true,
        difficulty: true,
        totalScenes: true,
        totalEndings: true,
        coverUrl: true,
        createdAt: true
      }
    });

    res.json({ stories });
  } catch (error) {
    console.error('Failed to list stories:', error);
    res.status(500).json({ error: 'Failed to list stories' });
  }
});

export default router;
