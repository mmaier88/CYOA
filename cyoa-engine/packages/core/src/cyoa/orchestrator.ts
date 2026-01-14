import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import {
  StoryGenerationState,
  Scene,
  Decision,
  WorldRules,
  DiamondConfig,
  calculateDiamondShape,
  generateCYOASceneId,
  CYOA_CONSTANTS,
  Genre,
  Tone,
  Difficulty,
  EndingQuality
} from './state.js';
import { CYOAEditorAgent, CYOAEditorOutput, CYOA_POLISHED_PROMPT_ADDITION } from './editor.js';
import { buildCondensedStyleGuide, GUIDING_SENTENCE } from './style-guide.js';

/**
 * Generation mode - affects prose quality vs speed tradeoff
 */
export type GenerationMode = 'draft' | 'polished';

/**
 * Progress callback for status updates
 */
export type ProgressCallback = (progress: number, message: string) => Promise<void>;

/**
 * Scene generation output
 */
interface GeneratedScene {
  content: string;
  decisions: Decision[];
  word_count: number;
}

/**
 * CYOA Orchestrator - generates diamond-branching interactive stories
 *
 * Uses an Editor agent for prose quality while adapting the structure
 * for CYOA's branching narrative.
 *
 * Diamond structure:
 * - Intro (1 scene) -> Expansion (2-4 scenes) -> Maximum width -> Contraction -> Endings (2-4)
 */
export class CYOAOrchestrator {
  private mode: GenerationMode = 'draft';
  private editor: CYOAEditorAgent;

  constructor(
    private llm: LLMClient,
    private jobId: string,
    private onProgress: ProgressCallback
  ) {
    this.editor = new CYOAEditorAgent(llm);
  }

  /**
   * Run the complete story generation pipeline
   */
  async run(
    state: StoryGenerationState,
    mode: GenerationMode = 'draft'
  ): Promise<StoryGenerationState> {
    this.mode = mode;
    const modeLabel = mode === 'draft' ? 'Draft' : 'Polished';

    const context: RequestContext = { jobId: this.jobId, agent: 'cyoa-orchestrator' };

    // Phase 1: Generate world rules
    await this.onProgress(5, `Building story world... (${modeLabel} mode)`);
    state = await this.generateWorldRules(state, context);

    // Phase 2: Plan the diamond structure
    await this.onProgress(10, 'Planning story branches...');
    const diamondShape = calculateDiamondShape(state.diamond_config);
    const totalScenes = diamondShape.reduce((a, b) => a + b, 0);

    // Phase 3: Generate scenes level by level
    for (let level = 0; level < state.diamond_config.max_levels; level++) {
      const scenesAtLevel = diamondShape[level];
      const isLastLevel = level === state.diamond_config.max_levels - 1;

      await this.onProgress(
        10 + Math.floor((level / state.diamond_config.max_levels) * 80),
        `Writing ${isLastLevel ? 'endings' : `level ${level + 1}`}...`
      );

      state = await this.generateLevel(state, level, scenesAtLevel, isLastLevel, context);
    }

    // Phase 4: Validate and finalize
    await this.onProgress(95, 'Validating story paths...');
    state = this.validatePaths(state);

    await this.onProgress(100, 'Complete!');

    return state;
  }

  /**
   * Generate world rules from genre/premise
   */
  private async generateWorldRules(
    state: StoryGenerationState,
    context: RequestContext
  ): Promise<StoryGenerationState> {
    const prompt = `You are creating a ${state.genre} interactive story.

Premise: ${state.premise}
Tone: ${state.tone}
Difficulty: ${state.difficulty}
Player name: ${state.player.name}
Player personality: ${state.player.personality || 'adaptable'}

Create the world rules for this story. Include:
1. Setting - where/when does this take place?
2. Key characters - 2-4 NPCs the player will interact with
3. World rules - 3-5 rules that affect choices
4. Possible endings - plan ${state.diamond_config.min_endings}-${state.diamond_config.max_endings} endings of varying quality

Important: The player is the protagonist. All choices should feel meaningful.`;

    const response = await this.llm.generateJSON({
      systemPrompt: CYOA_SYSTEM_PROMPT,
      userPrompt: prompt,
      schema: WorldRulesSchema,
      context
    });

    return {
      ...state,
      world_rules: response.content
    };
  }

  /**
   * Generate all scenes at a given level of the diamond
   */
  private async generateLevel(
    state: StoryGenerationState,
    level: number,
    sceneCount: number,
    isLastLevel: boolean,
    context: RequestContext
  ): Promise<StoryGenerationState> {
    const previousLevelSceneIds = level > 0 ? state.scenes_by_level[level - 1] : [];

    for (let i = 0; i < sceneCount; i++) {
      const sceneId = generateCYOASceneId(level, i);

      // Determine which previous scenes lead to this one
      const incomingSceneIds = this.calculateIncomingScenes(
        level,
        i,
        sceneCount,
        previousLevelSceneIds,
        state.diamond_config
      );

      // Determine scene type
      const sceneType = level === 0 ? 'intro' :
                        isLastLevel ? 'ending' :
                        'branch';

      // Generate the scene content and decisions
      const scene = await this.generateScene(
        state,
        sceneId,
        sceneType,
        level,
        incomingSceneIds,
        isLastLevel,
        context
      );

      // Add scene to state
      state.scenes[sceneId] = scene;
      state.scenes_by_level[level] = [...state.scenes_by_level[level], sceneId];
      state.scenes_generated++;
      state.total_words += scene.content.split(/\s+/).length;

      // Connect previous scenes to this one
      for (const prevId of incomingSceneIds) {
        if (state.scenes[prevId]) {
          // Find or create a decision that leads to this scene
          const prevScene = state.scenes[prevId];
          if (!prevScene.decisions.some(d => d.leads_to === sceneId)) {
            // This is handled during generation, but verify
          }
        }
      }
    }

    // After generating all scenes at this level, update decisions in previous level
    if (level > 0) {
      state = this.connectDecisions(state, level);
    }

    return state;
  }

  /**
   * Calculate which scenes from the previous level lead to this scene
   * Implements the diamond convergence pattern
   */
  private calculateIncomingScenes(
    level: number,
    index: number,
    scenesAtThisLevel: number,
    previousLevelSceneIds: string[],
    config: DiamondConfig
  ): string[] {
    if (level === 0) return [];
    if (previousLevelSceneIds.length === 0) return [];

    const prevCount = previousLevelSceneIds.length;
    const incoming: string[] = [];

    // Diamond pattern: each scene receives connections from 1-2 previous scenes
    // Earlier levels: fan out (1 prev -> multiple next)
    // Later levels: converge (multiple prev -> 1 next)

    const midpoint = Math.floor(config.max_levels / 2);
    const isExpanding = level <= midpoint;

    if (isExpanding) {
      // Expanding phase: each prev scene leads to 1-2 next scenes
      // Calculate which prev scene(s) lead here
      const ratio = prevCount / scenesAtThisLevel;
      const primaryPrev = Math.floor(index * ratio);
      incoming.push(previousLevelSceneIds[Math.min(primaryPrev, prevCount - 1)]);

      // Sometimes add secondary connection for variety
      if (index > 0 && Math.random() > 0.5) {
        const secondary = Math.max(0, primaryPrev - 1);
        if (!incoming.includes(previousLevelSceneIds[secondary])) {
          incoming.push(previousLevelSceneIds[secondary]);
        }
      }
    } else {
      // Contracting phase: multiple prev scenes can lead to same next scene
      const ratio = scenesAtThisLevel / prevCount;
      const startPrev = Math.floor(index / ratio);
      const endPrev = Math.min(prevCount - 1, Math.floor((index + 1) / ratio));

      for (let p = startPrev; p <= endPrev; p++) {
        incoming.push(previousLevelSceneIds[p]);
      }

      // Ensure at least one incoming
      if (incoming.length === 0) {
        incoming.push(previousLevelSceneIds[0]);
      }
    }

    return [...new Set(incoming)]; // Deduplicate
  }

  /**
   * Generate a single scene with its decisions
   * Includes editor review and retry logic for quality assurance
   */
  private async generateScene(
    state: StoryGenerationState,
    sceneId: string,
    sceneType: 'intro' | 'branch' | 'consequence' | 'ending',
    level: number,
    incomingSceneIds: string[],
    isEnding: boolean,
    context: RequestContext
  ): Promise<Scene> {
    // Build context from previous scenes
    const previousContext = incomingSceneIds
      .map(id => state.scenes[id]?.content || '')
      .filter(c => c.length > 0)
      .map((c, i) => `[Previous path ${i + 1}]: ${c.substring(0, 200)}...`)
      .join('\n\n');

    // Determine decisions to generate
    const decisionsToGenerate = isEnding ? 0 : state.diamond_config.decisions_per_scene;

    // Calculate ending quality if this is an ending
    let endingQuality: EndingQuality | undefined;
    let endingSummary: string | undefined;

    if (isEnding && state.world_rules?.possible_endings) {
      // Distribute ending qualities across endings
      const endingIndex = state.scenes_by_level[level]?.length || 0;
      const plannedEnding = state.world_rules.possible_endings[endingIndex % state.world_rules.possible_endings.length];
      endingQuality = plannedEnding?.quality || 'neutral';
      endingSummary = plannedEnding?.summary;
    }

    // Generation with editor review loop
    let attempts = 0;
    let additionalConstraints: string[] = [];
    let finalContent: string = '';
    let finalDecisions: Decision[] = [];

    while (attempts < CYOA_CONSTANTS.MAX_SCENE_REGENERATIONS) {
      attempts++;

      const prompt = this.buildScenePrompt(
        state,
        sceneId,
        sceneType,
        level,
        previousContext,
        decisionsToGenerate,
        endingQuality,
        additionalConstraints
      );

      const response = await this.llm.generateJSON({
        systemPrompt: this.mode === 'polished'
          ? SCENE_WRITER_SYSTEM_PROMPT + CYOA_POLISHED_PROMPT_ADDITION
          : SCENE_WRITER_SYSTEM_PROMPT,
        userPrompt: prompt,
        schema: GeneratedSceneSchema,
        context: { ...context, sceneId, attempt: attempts }
      });

      const rawContent = response.content;

      console.log(`[${this.jobId}] Scene ${sceneId} raw response:`, {
        hasNarrative: !!rawContent.narrative,
        narrativeLength: rawContent.narrative?.length || 0,
        decisionsCount: rawContent.decisions?.length || 0,
        decisions: rawContent.decisions
      });

      // Build decisions with placeholder leads_to
      const decisions: Decision[] = (rawContent.decisions || []).map((d: any, i: number) => ({
        id: `${sceneId}_decision_${i}`,
        text: d.text,
        consequence_hint: d.consequence_hint,
        leads_to: '', // Will be filled in during connectDecisions
        choice_order: i + 1
      }));

      // Validate non-ending scenes have decisions
      if (!isEnding && decisions.length === 0 && attempts < CYOA_CONSTANTS.MAX_SCENE_REGENERATIONS) {
        console.warn(`[${this.jobId}] Scene ${sceneId} missing decisions, retrying...`);
        additionalConstraints = [
          'CRITICAL: You MUST include the "decisions" array with player choices.',
          'The decisions array was empty in your previous response.',
          `Include exactly ${decisionsToGenerate} decisions in your JSON output.`
        ];
        continue; // Retry
      }

      // Editor review (skip in draft mode for speed, only review key scenes)
      if (this.mode === 'polished' || sceneType === 'intro' || isEnding) {
        const evaluation = await this.editor.evaluateScene(
          rawContent.narrative,
          decisions,
          state,
          sceneType,
          { ...context, sceneId, agent: 'editor' }
        );

        console.log(`[${this.jobId}] Scene ${sceneId} evaluation:`, {
          decision: evaluation.decision,
          quality: evaluation.quality,
          attempt: attempts
        });

        if (evaluation.decision === 'ACCEPT') {
          // Use edited content if provided, otherwise use original
          finalContent = evaluation.edited_content || rawContent.narrative;
          finalDecisions = decisions;
          break;
        } else if (evaluation.decision === 'REWRITE' && attempts < CYOA_CONSTANTS.MAX_SCENE_REGENERATIONS) {
          // Add rewrite instructions as constraints for next attempt
          additionalConstraints = [
            evaluation.rewrite_instructions || evaluation.reason
          ];
          console.log(`[${this.jobId}] Scene ${sceneId} needs rewrite:`, evaluation.rewrite_instructions);
        } else if (evaluation.decision === 'REGENERATE' && attempts < CYOA_CONSTANTS.MAX_SCENE_REGENERATIONS) {
          // Clear previous attempts, start fresh with regeneration guidance
          additionalConstraints = [
            `PREVIOUS ATTEMPT FAILED: ${evaluation.regenerate_reason || evaluation.reason}`,
            'Focus on vivid sensory details and concrete action.',
            'Make choices feel genuinely different and consequential.'
          ];
          console.log(`[${this.jobId}] Scene ${sceneId} needs regeneration:`, evaluation.regenerate_reason);
        } else {
          // Max attempts reached or unexpected state - use what we have
          finalContent = rawContent.narrative;
          finalDecisions = decisions;
          break;
        }
      } else {
        // Draft mode without editor review for branch scenes
        finalContent = rawContent.narrative;
        finalDecisions = decisions;
        break;
      }
    }

    return {
      id: sceneId,
      scene_type: sceneType,
      level,
      content: finalContent,
      decisions: finalDecisions,
      is_ending: isEnding,
      ending_quality: endingQuality,
      ending_summary: endingSummary,
      previous_scene_ids: incomingSceneIds
    };
  }

  /**
   * Build the prompt for scene generation
   */
  private buildScenePrompt(
    state: StoryGenerationState,
    sceneId: string,
    sceneType: string,
    level: number,
    previousContext: string,
    decisionsToGenerate: number,
    endingQuality?: EndingQuality,
    additionalConstraints: string[] = []
  ): string {
    const { genre, tone, difficulty, player, world_rules, diamond_config } = state;

    let prompt = `${GUIDING_SENTENCE}

Generate a scene for an interactive ${genre} story.

## STORY CONTEXT
Setting: ${world_rules?.setting || 'Unknown'}
Tone: ${tone}
Protagonist: ${player.name}${player.personality ? ` (${player.personality})` : ''}

## SCENE INFO
Scene ID: ${sceneId}
Type: ${sceneType}
Level: ${level + 1} of ${diamond_config.max_levels}

${buildCondensedStyleGuide()}
`;

    if (previousContext) {
      prompt += `
## PREVIOUS SCENES (paths that led here)
${previousContext}
`;
    }

    if (sceneType === 'intro') {
      prompt += `
## TASK
Write the opening scene that:
1. Introduces ${player.name} and their situation using THIRD-PERSON narration
2. Establishes the world and stakes with sensory, cinematic prose
3. Ends with a clear decision moment: transition to SECOND-PERSON for the choice framing only
4. Provides ${decisionsToGenerate} meaningful choices

Start in observation mode. Let tension build. Then offer agency.
`;
    } else if (sceneType === 'ending') {
      prompt += `
## TASK
Write a ${endingQuality || 'neutral'} ending that:
1. Resolves the story using THIRD-PERSON narration
2. Gives a satisfying conclusion - show, don't tell
3. May use a brief FIRST-PERSON moment (1-3 sentences) for emotional climax if appropriate
4. No decisions needed - this is a terminal scene

Ending quality: ${endingQuality}
`;
    } else {
      prompt += `
## TASK
Write a scene that:
1. Continues from previous events using THIRD-PERSON narration
2. Builds atmosphere and tension before the choice
3. Raises stakes or reveals new information through action and description
4. Transitions to SECOND-PERSON only for the final choice framing (1-2 sentences)
5. Provides ${decisionsToGenerate} meaningful choices

Follow the rhythm: Observe → Tension → Decide
Each choice should feel distinct and lead to different outcomes.
`;
    }

    prompt += `
## REQUIREMENTS
- Length: ${diamond_config.words_per_scene.min}-${diamond_config.words_per_scene.max} words
- PRIMARY: Close third-person narration for ${player.name} (70-80% of content)
- DECISIONS: Second-person "you" ONLY to frame the final choices (1-2 sentences max)
- Cinematic, sensory prose - let actions imply emotion
- Choices should feel meaningful, not arbitrary

## JSON OUTPUT FORMAT
Return a JSON object with:
- "narrative": The scene content (string) - third-person narration, second-person only for choice framing
${decisionsToGenerate > 0 ? `- "decisions": Array of exactly ${decisionsToGenerate} choice objects, each with:
  - "text": The choice text (1-2 sentences, action-focused)
  - "consequence_hint": Optional hint about what might happen (subtle, no spoilers)` : '- "decisions": Empty array [] (this is an ending scene)'}
`;

    // Add editor constraints from previous failed attempts
    if (additionalConstraints.length > 0) {
      prompt += `
## EDITOR FEEDBACK (Address these issues)
${additionalConstraints.map(c => `- ${c}`).join('\n')}
`;
    }

    return prompt;
  }

  /**
   * Connect decisions from one level to scenes in the next level
   */
  private connectDecisions(state: StoryGenerationState, targetLevel: number): StoryGenerationState {
    const sourceLevelSceneIds = state.scenes_by_level[targetLevel - 1];
    const targetSceneIds = state.scenes_by_level[targetLevel];

    if (!sourceLevelSceneIds || !targetSceneIds) return state;

    for (const sourceId of sourceLevelSceneIds) {
      const sourceScene = state.scenes[sourceId];
      if (!sourceScene || sourceScene.decisions.length === 0) continue;

      // Find which target scenes this source leads to
      const leadingTo = targetSceneIds.filter(
        targetId => state.scenes[targetId]?.previous_scene_ids?.includes(sourceId)
      );

      // Distribute decisions across targets
      sourceScene.decisions.forEach((decision, i) => {
        const targetIndex = i % leadingTo.length;
        decision.leads_to = leadingTo[targetIndex] || targetSceneIds[0];
      });
    }

    return state;
  }

  /**
   * Validate that all paths lead to endings
   */
  private validatePaths(state: StoryGenerationState): StoryGenerationState {
    const lastLevel = state.diamond_config.max_levels - 1;
    const endingSceneIds = state.scenes_by_level[lastLevel];

    // Ensure all endings are marked as endings
    for (const endingId of endingSceneIds) {
      if (state.scenes[endingId]) {
        state.scenes[endingId].is_ending = true;
        state.scenes[endingId].decisions = []; // No decisions on endings
      }
    }

    // Verify all non-ending scenes have decisions that lead somewhere
    for (const [sceneId, scene] of Object.entries(state.scenes)) {
      if (!scene.is_ending && scene.decisions.length === 0) {
        console.warn(`Scene ${sceneId} has no decisions but is not an ending`);
      }

      for (const decision of scene.decisions) {
        if (!decision.leads_to || !state.scenes[decision.leads_to]) {
          console.warn(`Decision ${decision.id} leads to non-existent scene`);
          // Fix by pointing to a random valid target
          const validTargets = state.scenes_by_level[scene.level + 1] || [];
          if (validTargets.length > 0) {
            decision.leads_to = validTargets[0];
          }
        }
      }
    }

    return state;
  }
}

/**
 * Schema for generated scene output
 */
const GeneratedSceneSchema = z.object({
  narrative: z.string().describe('The scene content in second person'),
  decisions: z.array(z.object({
    text: z.string().describe('Choice text (1-2 sentences)'),
    consequence_hint: z.string().optional().describe('Subtle hint about outcome')
  })).default([]).describe('Player choices - REQUIRED for non-ending scenes'),
  ending_summary: z.string().optional().describe('Brief ending description if this is an ending')
});

/**
 * Case-insensitive enum helper for LLM robustness
 */
const qualityEnum = z.string().transform(s => s.toLowerCase()).pipe(
  z.enum(['bad', 'neutral', 'good', 'best', 'secret'])
).default('neutral');

/**
 * Schema for world rules generation - with defaults for robustness
 */
const WorldRulesSchema = z.object({
  setting: z.string().or(z.object({}).passthrough().transform(obj => JSON.stringify(obj))),
  key_characters: z.array(z.object({
    name: z.string(),
    role: z.string().default('supporting'),
    relationship_to_player: z.string().default('acquaintance')
  })).default([]),
  rules: z.array(z.string()).default([]),
  possible_endings: z.array(z.object({
    quality: qualityEnum,
    condition: z.string().default('Through player choices'),
    summary: z.string().default('Story concludes')
  })).default([
    { quality: 'bad', condition: 'Poor choices', summary: 'Unfavorable outcome' },
    { quality: 'good', condition: 'Good choices', summary: 'Positive outcome' },
    { quality: 'best', condition: 'Best choices', summary: 'Optimal outcome' }
  ])
});

/**
 * System prompt for CYOA world building
 */
const CYOA_SYSTEM_PROMPT = `You are a master interactive fiction author. You create engaging choose-your-own-adventure stories where every choice matters.

Key principles:
1. AGENCY - Choices must feel meaningful and impactful
2. CONSEQUENCE - Decisions lead to different outcomes
3. IMMERSION - Second person, present tense, vivid details
4. PACING - Each scene moves the story forward
5. REPLAY VALUE - Multiple paths worth exploring

The player should feel like the protagonist of their own adventure.`;

/**
 * System prompt for scene writing
 */
const SCENE_WRITER_SYSTEM_PROMPT = `You write individual scenes for interactive fiction. You ALWAYS respond with valid JSON.

## Scene Requirements
1. Be written in second person ("you")
2. Use present tense for immediacy
3. Be vivid and immersive
4. End with clear, distinct choices (unless it's an ending)
5. Be between 250-600 words

## Choice Requirements (for non-ending scenes)
- Feel meaningfully different
- Not have an obviously "correct" answer
- Hint at consequences without spoiling them
- Be phrased as actions, not just "go left/go right"

Example good choices:
- "Trust the stranger and accept their help"
- "Demand answers before going further"
- "Slip away while they're distracted"

## JSON Output Format
You MUST respond with a JSON object containing:
{
  "narrative": "The scene content here...",
  "decisions": [
    {"text": "First choice text", "consequence_hint": "optional hint"},
    {"text": "Second choice text", "consequence_hint": "optional hint"}
  ]
}

For ending scenes, the "decisions" array should be empty [].`;
