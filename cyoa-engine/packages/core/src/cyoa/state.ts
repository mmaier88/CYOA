import { z } from 'zod';

/**
 * Scene types in the diamond structure
 */
export const SceneTypeSchema = z.enum([
  'intro',       // Opening scene (always one)
  'branch',      // Decision point with multiple paths
  'consequence', // Result of a previous decision
  'ending'       // Terminal scene
]);

export type SceneType = z.infer<typeof SceneTypeSchema>;

/**
 * Ending quality tiers
 */
export const EndingQualitySchema = z.enum([
  'bad',      // Poor outcome
  'neutral',  // Mixed outcome
  'good',     // Positive outcome
  'best',     // Optimal outcome
  'secret'    // Hidden/special ending
]);

export type EndingQuality = z.infer<typeof EndingQualitySchema>;

/**
 * Genre templates for CYOA stories
 */
export const GenreSchema = z.enum([
  'fantasy',   // Swords, magic, quests
  'mystery',   // Detective, clues, suspects
  'scifi',     // Space, technology, survival
  'romance',   // Relationships, choices, drama
  'horror'     // Survival, tension, escape
]);

export type Genre = z.infer<typeof GenreSchema>;

/**
 * Tone settings
 */
export const ToneSchema = z.enum([
  'light',     // Lighter consequences, more forgiving
  'balanced',  // Mix of light and dark
  'dark'       // Serious consequences, high stakes
]);

export type Tone = z.infer<typeof ToneSchema>;

/**
 * Difficulty settings - affects how forgiving choices are
 */
export const DifficultySchema = z.enum([
  'forgiving',  // Bad choices rarely lead to bad endings
  'normal',     // Balanced consequences
  'punishing'   // Poor choices quickly lead to bad endings
]);

export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Decision - a choice presented to the player
 */
export const DecisionSchema = z.object({
  id: z.string(),
  text: z.string().describe('Choice text shown to player (1-2 sentences)'),
  consequence_hint: z.string().optional().describe('Optional subtle hint about outcome'),
  leads_to: z.string().describe('Scene ID this decision leads to'),
  choice_order: z.number().min(1).max(4).describe('Display order (1-4)')
});

export type Decision = z.infer<typeof DecisionSchema>;

/**
 * Scene - a node in the story graph
 */
export const SceneSchema = z.object({
  id: z.string(),
  scene_type: SceneTypeSchema,
  level: z.number().min(0).describe('Depth in the diamond (0 = intro)'),
  content: z.string().describe('Narrative content (300-500 words)'),
  decisions: z.array(DecisionSchema).max(4).describe('Choices available (0 for endings)'),
  is_ending: z.boolean().default(false),
  ending_quality: EndingQualitySchema.optional(),
  ending_summary: z.string().optional().describe('Brief summary of this ending'),
  previous_scene_ids: z.array(z.string()).describe('Scenes that can lead here'),
  character_state_changes: z.record(z.string(), z.any()).optional()
});

export type Scene = z.infer<typeof SceneSchema>;

/**
 * Diamond structure configuration
 * Controls the shape of the branching story
 *
 * Example "Quick" story (5-8 scenes):
 * Level 0: 1 intro
 * Level 1: 2 branches (from intro decision)
 * Level 2: 3-4 scenes (maximum width)
 * Level 3: 2-3 endings
 *
 * Example "Standard" story (10-15 scenes):
 * Level 0: 1 intro
 * Level 1: 2-3 branches
 * Level 2: 4-5 scenes (maximum width)
 * Level 3: 3-4 scenes (converging)
 * Level 4: 3-4 endings
 */
export const DiamondConfigSchema = z.object({
  max_levels: z.number().min(3).max(6).describe('Total depth of diamond'),
  max_width: z.number().min(2).max(6).describe('Maximum scenes at widest level'),
  min_endings: z.number().min(2).max(4),
  max_endings: z.number().min(3).max(8),
  decisions_per_scene: z.number().min(2).max(4).default(3).describe('Choices at each branch'),
  words_per_scene: z.object({
    min: z.number().default(300),
    max: z.number().default(500)
  }).default({ min: 300, max: 500 })
});

export type DiamondConfig = z.infer<typeof DiamondConfigSchema>;

/**
 * Story presets - pre-configured diamond shapes
 */
export const STORY_PRESETS = {
  quick: {
    max_levels: 4,
    max_width: 4,
    min_endings: 2,
    max_endings: 3,
    decisions_per_scene: 2,
    words_per_scene: { min: 250, max: 400 }
  },
  standard: {
    max_levels: 5,
    max_width: 5,
    min_endings: 3,
    max_endings: 5,
    decisions_per_scene: 3,
    words_per_scene: { min: 300, max: 500 }
  },
  epic: {
    max_levels: 6,
    max_width: 6,
    min_endings: 4,
    max_endings: 7,
    decisions_per_scene: 3,
    words_per_scene: { min: 400, max: 600 }
  }
} as const satisfies Record<string, DiamondConfig>;

export type StoryPreset = keyof typeof STORY_PRESETS;

/**
 * Player customization - minimal input for personalization
 */
export const PlayerCustomizationSchema = z.object({
  name: z.string().min(1).max(50).describe('Player character name'),
  gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
  personality: z.string().max(100).optional().describe('3-5 word personality hint')
});

export type PlayerCustomization = z.infer<typeof PlayerCustomizationSchema>;

/**
 * World rules - generated from genre/premise
 */
export const WorldRulesSchema = z.object({
  setting: z.string().describe('Where/when the story takes place'),
  key_characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    relationship_to_player: z.string()
  })).describe('NPCs the player will interact with'),
  rules: z.array(z.string()).describe('World rules that affect choices'),
  possible_endings: z.array(z.object({
    quality: EndingQualitySchema,
    condition: z.string().describe('What leads to this ending'),
    summary: z.string().describe('Brief description')
  })).describe('Planned endings for the story')
});

export type WorldRules = z.infer<typeof WorldRulesSchema>;

/**
 * Story generation state - tracks the generation process
 */
export const StoryGenerationStateSchema = z.object({
  // Input parameters
  genre: GenreSchema,
  tone: ToneSchema,
  difficulty: DifficultySchema,
  preset: z.enum(['quick', 'standard', 'epic']),
  premise: z.string().describe('User-provided story hook'),
  player: PlayerCustomizationSchema,

  // Generated world
  world_rules: WorldRulesSchema.optional(),

  // Diamond structure
  diamond_config: DiamondConfigSchema,

  // Scene graph (built during generation)
  scenes: z.record(z.string(), SceneSchema).describe('Scene ID -> Scene'),
  scenes_by_level: z.array(z.array(z.string())).describe('Level index -> Scene IDs'),

  // Generation tracking
  current_level: z.number().default(0),
  scenes_generated: z.number().default(0),
  total_words: z.number().default(0),

  // Quality tracking (from Editor)
  fingerprints: z.array(z.any()).default([]).describe('Recent scene fingerprints for dedup')
});

export type StoryGenerationState = z.infer<typeof StoryGenerationStateSchema>;

/**
 * Create initial story generation state
 */
export function createStoryGenerationState(input: {
  genre: Genre;
  tone: Tone;
  difficulty: Difficulty;
  preset: StoryPreset;
  premise: string;
  player: PlayerCustomization;
}): StoryGenerationState {
  const diamond_config = STORY_PRESETS[input.preset];

  return {
    genre: input.genre,
    tone: input.tone,
    difficulty: input.difficulty,
    preset: input.preset,
    premise: input.premise,
    player: input.player,
    diamond_config,
    scenes: {},
    scenes_by_level: Array(diamond_config.max_levels).fill([]).map(() => []),
    current_level: 0,
    scenes_generated: 0,
    total_words: 0,
    fingerprints: []
  };
}

/**
 * Calculate expected scenes at each level of the diamond
 *
 * Diamond shape:
 * - Level 0: 1 (intro)
 * - Level 1 to midpoint: expands toward max_width
 * - Midpoint to end-1: contracts toward ending count
 * - Final level: endings
 */
export function calculateDiamondShape(config: DiamondConfig): number[] {
  const levels = config.max_levels;
  const midpoint = Math.floor(levels / 2);
  const shape: number[] = [];

  for (let level = 0; level < levels; level++) {
    if (level === 0) {
      // Intro - always 1
      shape.push(1);
    } else if (level <= midpoint) {
      // Expanding phase
      const progress = level / midpoint;
      const width = Math.ceil(1 + (config.max_width - 1) * progress);
      shape.push(Math.min(width, config.max_width));
    } else if (level === levels - 1) {
      // Final level - endings
      shape.push(Math.ceil((config.min_endings + config.max_endings) / 2));
    } else {
      // Contracting phase
      const remaining = levels - 1 - level;
      const progress = remaining / (levels - 1 - midpoint);
      const width = Math.ceil(config.min_endings + (config.max_width - config.min_endings) * progress);
      shape.push(width);
    }
  }

  return shape;
}

/**
 * Generate a scene ID
 */
export function generateCYOASceneId(level: number, index: number): string {
  return `scene_L${level}_${index}`;
}

/**
 * Constants for CYOA generation
 */
export const CYOA_CONSTANTS = {
  MAX_SCENE_REGENERATIONS: 3,
  MIN_DECISIONS_PER_BRANCH: 2,
  MAX_DECISIONS_PER_BRANCH: 4,
  FINGERPRINT_WINDOW_SIZE: 10,
  SCENE_WORDS_MIN: 250,
  SCENE_WORDS_MAX: 600
} as const;
