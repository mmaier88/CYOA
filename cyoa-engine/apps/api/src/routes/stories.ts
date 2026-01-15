import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createLLMClient, generateSpeech, estimateDuration, computeContentHash, DEFAULT_VOICE_ID } from '@chronicle/core';

const router = Router();
const prisma = new PrismaClient();

// LLM client for character generation
const llm = createLLMClient();

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

// Schema for character generation response
const CharacterGenerationSchema = z.object({
  protagonist: z.object({
    name: z.string(),
    gender: z.enum(['male', 'female']),
    age: z.string(),
    role: z.string(),
    background: z.string(),
    personality: z.string(),
    motivation: z.string(),
    flaw: z.string(),
  }),
  supporting_characters: z.array(z.object({
    name: z.string(),
    gender: z.enum(['male', 'female']),
    role: z.string(),
    relationship: z.string(),
    description: z.string(),
    secret: z.string().optional(),
  })),
  story_hook: z.string(),
});

/**
 * POST /v1/stories/generate-characters
 * Generate characters for story preview (backcover)
 */
router.post('/generate-characters', async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre, premise, sliders } = req.body;

    if (!genre || !premise) {
      res.status(400).json({ error: 'Missing required fields: genre, premise' });
      return;
    }

    // Build slider context for the prompt
    let sliderContext = '';
    if (sliders) {
      const sliderDescriptions: string[] = [];
      if (sliders.violence && sliders.violence !== 'auto') {
        const level = sliders.violence === 1 ? 'minimal' : sliders.violence === 5 ? 'brutal' : 'moderate';
        sliderDescriptions.push(`Violence: ${level}`);
      }
      if (sliders.romance && sliders.romance !== 'auto') {
        const level = sliders.romance === 1 ? 'minimal' : sliders.romance === 5 ? 'steamy' : 'moderate';
        sliderDescriptions.push(`Romance: ${level}`);
      }
      if (sliders.tone && sliders.tone !== 'auto') {
        const level = sliders.tone === 1 ? 'hopeful' : sliders.tone === 5 ? 'tragic' : 'bittersweet';
        sliderDescriptions.push(`Tone: ${level}`);
      }
      if (sliders.darkness && sliders.darkness !== 'auto') {
        const level = sliders.darkness === 1 ? 'light' : sliders.darkness === 5 ? 'dark' : 'gray';
        sliderDescriptions.push(`Darkness: ${level}`);
      }
      if (sliderDescriptions.length > 0) {
        sliderContext = `\n\nStory settings: ${sliderDescriptions.join(', ')}`;
      }
    }

    const systemPrompt = `You are a character designer for interactive audio fiction.
Generate compelling characters for a ${genre} story.
Characters should feel real, with clear motivations and flaws.
The protagonist should be someone the audience can root for (or against).
Supporting characters should have distinct roles and relationships.`;

    const userPrompt = `Create characters for this ${genre} story:

Premise: ${premise}${sliderContext}

Generate:
1. A protagonist with:
   - A fitting name (match the genre/setting)
   - Gender (male or female)
   - Age description (e.g., "early 30s", "teenager", "middle-aged")
   - Role in the story (e.g., "reluctant hero", "cunning detective")
   - Brief background (1-2 sentences)
   - Personality traits (3-4 comma-separated traits)
   - Core motivation (what drives them)
   - Character flaw (weakness that creates conflict)

2. 3-4 supporting characters, each with:
   - Name
   - Gender
   - Role (e.g., "mentor", "love interest", "antagonist", "ally")
   - Relationship to protagonist
   - Brief description (1-2 sentences)
   - Optional: A secret or hidden motivation

3. A story hook (2-3 sentences that tease the story and make the reader want to know more)

Respond with JSON only.`;

    const response = await llm.generateJSON({
      systemPrompt,
      userPrompt,
      schema: CharacterGenerationSchema,
      context: {
        jobId: 'character-gen-' + Date.now(),
        agent: 'cyoa-orchestrator',
      },
    });

    res.json({ characters: response.content });
  } catch (error) {
    console.error('Failed to generate characters:', error);
    res.status(500).json({ error: 'Failed to generate characters' });
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

// In-memory audio cache (would use Redis/S3 in production)
const audioCache: Map<string, { buffer: Buffer; duration: number; generatedAt: Date }> = new Map();

/**
 * POST /v1/stories/:id/scenes/:sceneId/audio
 * Generate or retrieve TTS audio for a scene
 */
router.post('/:id/scenes/:sceneId/audio', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, sceneId } = req.params;
    const { voiceId = DEFAULT_VOICE_ID } = req.body;

    // Verify the story job exists and is complete
    const job = await prisma.storyJob.findUnique({
      where: { id }
    });

    if (!job || job.status !== 'succeeded' || !job.storyId) {
      res.status(404).json({ error: 'Story not found or not complete' });
      return;
    }

    // Get the scene
    const scene = await prisma.scene.findFirst({
      where: {
        id: sceneId,
        storyId: job.storyId
      }
    });

    if (!scene) {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }

    // Check cache
    const cacheKey = `${sceneId}-${voiceId}-${computeContentHash(scene.content)}`;
    const cached = audioCache.get(cacheKey);

    if (cached) {
      console.log(`[Audio] Cache hit for scene ${sceneId}`);
      res.json({
        status: 'ready',
        audio_url: `/v1/stories/${id}/scenes/${sceneId}/audio/stream?key=${encodeURIComponent(cacheKey)}`,
        duration_seconds: cached.duration
      });
      return;
    }

    // Check if ELEVENLABS_API_KEY is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('[Audio] No ELEVENLABS_API_KEY, returning mock response');
      res.json({
        status: 'unavailable',
        error: 'TTS not configured',
        duration_seconds: estimateDuration(scene.content)
      });
      return;
    }

    // Generate audio
    console.log(`[Audio] Generating audio for scene ${sceneId}`);
    res.json({ status: 'generating' });

    // Generate in background (client will poll)
    generateSpeech(scene.content, voiceId)
      .then((buffer) => {
        const duration = estimateDuration(scene.content);
        audioCache.set(cacheKey, { buffer, duration, generatedAt: new Date() });
        console.log(`[Audio] Cached audio for scene ${sceneId}, size: ${buffer.length}`);
      })
      .catch((err) => {
        console.error(`[Audio] Failed to generate audio for scene ${sceneId}:`, err);
      });
  } catch (error) {
    console.error('Failed to get scene audio:', error);
    res.status(500).json({ error: 'Failed to get scene audio' });
  }
});

/**
 * GET /v1/stories/:id/scenes/:sceneId/audio/stream
 * Stream cached audio for a scene
 */
router.get('/:id/scenes/:sceneId/audio/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.query;

    if (!key || typeof key !== 'string') {
      res.status(400).json({ error: 'Missing cache key' });
      return;
    }

    const cached = audioCache.get(key);

    if (!cached) {
      res.status(404).json({ error: 'Audio not found in cache' });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', cached.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cached.buffer);
  } catch (error) {
    console.error('Failed to stream audio:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
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
