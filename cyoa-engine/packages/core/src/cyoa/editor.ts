import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import { StoryGenerationState, Scene, Decision } from './state.js';

/**
 * CYOA Editor decisions
 */
export type CYOAEditorDecision = 'ACCEPT' | 'REWRITE' | 'REGENERATE';

/**
 * Scene evaluation output
 */
export const CYOAEditorOutputSchema = z.object({
  decision: z.enum(['ACCEPT', 'REWRITE', 'REGENERATE']),

  // For ACCEPT - tightened version of the scene
  edited_content: z.string().optional(),

  // Quality scores (0-10) - all with defaults for robustness
  quality: z.object({
    immersion: z.number().min(0).max(10).default(7).describe('Sensory details, vivid description'),
    pacing: z.number().min(0).max(10).default(7).describe('Forward movement, appropriate length'),
    voice: z.number().min(0).max(10).default(7).describe('Second person consistency, engagement'),
    choices: z.number().min(0).max(10).default(7).describe('Distinct, meaningful choices (N/A for endings)')
  }).default({ immersion: 7, pacing: 7, voice: 7, choices: 7 }),

  // For REWRITE - specific improvements needed
  rewrite_instructions: z.string().optional(),

  // For REGENERATE - why the scene should be completely redone
  regenerate_reason: z.string().optional(),

  // Brief explanation of the decision
  reason: z.string().default('Scene evaluated')
});

export type CYOAEditorOutput = z.infer<typeof CYOAEditorOutputSchema>;

/**
 * CYOA Editor Agent - ensures scene quality
 *
 * Simpler than Chronicle's Editor - focused on:
 * 1. Prose quality (immersion, voice, pacing)
 * 2. Choice design (distinct, meaningful options)
 * 3. Reader engagement
 */
export class CYOAEditorAgent {
  constructor(private llm: LLMClient) {}

  /**
   * Evaluate a generated scene
   */
  async evaluateScene(
    rawContent: string,
    decisions: Decision[],
    state: StoryGenerationState,
    sceneType: 'intro' | 'branch' | 'consequence' | 'ending',
    context: RequestContext
  ): Promise<CYOAEditorOutput> {
    const prompt = this.buildEvaluationPrompt(rawContent, decisions, state, sceneType);

    const response = await this.llm.generateJSON({
      systemPrompt: CYOA_EDITOR_SYSTEM_PROMPT,
      userPrompt: prompt,
      schema: CYOAEditorOutputSchema,
      context: { ...context, agent: 'cyoa-editor' }
    });

    return response.content;
  }

  /**
   * Build evaluation prompt
   */
  private buildEvaluationPrompt(
    rawContent: string,
    decisions: Decision[],
    state: StoryGenerationState,
    sceneType: string
  ): string {
    const choiceSection = decisions.length > 0
      ? `## CHOICES
${decisions.map((d, i) => `${i + 1}. "${d.text}"${d.consequence_hint ? ` (hint: ${d.consequence_hint})` : ''}`).join('\n')}`
      : '## This is an ENDING scene - no choices required.';

    return `## STORY CONTEXT
Genre: ${state.genre}
Tone: ${state.tone}
Difficulty: ${state.difficulty}
Player: ${state.player.name}
Scene type: ${sceneType}

## TARGET WORD COUNT
${state.diamond_config.words_per_scene.min}-${state.diamond_config.words_per_scene.max} words

## SCENE CONTENT
${rawContent}

${choiceSection}

---

Evaluate this scene for an interactive ${state.genre} story.

Quality criteria:
1. IMMERSION: Does it use sensory details? Is the world vivid?
2. PACING: Does it move forward? Is the length appropriate?
3. VOICE: Is it consistently second person ("you")? Is it engaging?
4. CHOICES: Are the options distinct and meaningful? (Skip if ending)

Word count: ${rawContent.split(/\s+/).length} words

Decision guidelines:
- ACCEPT if quality scores average 7+ and no major issues
- REWRITE if prose is good but needs improvement (provide specific instructions)
- REGENERATE if fundamentally flawed (passive voice, boring, no stakes)

Respond with JSON.`;
  }

  /**
   * Calculate average quality score
   */
  static averageQuality(output: CYOAEditorOutput): number {
    const q = output.quality;
    return (q.immersion + q.pacing + q.voice + q.choices) / 4;
  }

  /**
   * Quick check if scene passes minimum quality
   */
  static passesMinimumQuality(output: CYOAEditorOutput, threshold: number = 6): boolean {
    const q = output.quality;
    return q.immersion >= threshold &&
           q.pacing >= threshold &&
           q.voice >= threshold;
  }
}

/**
 * System prompt for CYOA Editor
 */
const CYOA_EDITOR_SYSTEM_PROMPT = `You are the Quality Editor for interactive fiction (CYOA stories).

Your job is to evaluate scene quality and ensure an engaging player experience.

## Evaluation Criteria

### IMMERSION (0-10)
- Sensory details (sight, sound, smell, touch)
- Vivid, concrete descriptions
- World feels real and present
- 0 = generic/abstract, 10 = fully immersive

### PACING (0-10)
- Scene moves the story forward
- Appropriate length for content
- Tension or intrigue maintained
- 0 = static/dragging, 10 = perfect momentum

### VOICE (0-10)
- Consistent second person ("you")
- Present tense for immediacy
- Engaging, draws reader in
- 0 = distancing/awkward, 10 = intimate and compelling

### CHOICES (0-10) - Skip for endings
- Options feel meaningfully different
- No obviously "correct" answer
- Each choice implies different outcomes
- Phrased as actions, not "go left/right"
- 0 = arbitrary, 10 = agonizing decision

## Decision Guidelines

**ACCEPT** if:
- Average quality >= 7
- No score below 5
- Second person voice is consistent
- Provide edited version (tighten 10-15%)

**REWRITE** if:
- Quality is 5-7 average
- Specific improvements would help
- Core content is salvageable
- Provide detailed rewrite instructions

**REGENERATE** if:
- Quality below 5 average
- Major voice/POV problems
- Scene is fundamentally boring or static
- Would be faster to start over
- Explain what's wrong

## Output Requirements

For ACCEPT:
- Provide edited_content with tightened prose
- Cut filler words, strengthen verbs
- Trim 10-15% while preserving meaning

For REWRITE:
- Provide specific rewrite_instructions
- Note exactly what needs improvement
- Give examples where helpful

For REGENERATE:
- Provide regenerate_reason
- Explain why the scene fails
- Note what the new version should focus on

Be ruthless but fair. Players deserve quality.`;

/**
 * Polished mode system prompt addition
 */
export const CYOA_POLISHED_PROMPT_ADDITION = `
## POLISHED MODE ACTIVE

You are in POLISHED mode. Higher standards apply:
- Minimum score threshold: 7 (not 6)
- Prose must be publication-quality
- Choices must create genuine dilemmas
- Every word must earn its place

Tighten ruthlessly. Cut mercilessly. Polish until it shines.`;
