import { z } from 'zod';
import { LLMClient, RequestContext } from '../llm/client.js';
import { StoryGenerationState, Scene, Decision } from './state.js';
import { buildEditorStyleChecklist, GUIDING_SENTENCE, QUALITY_HEURISTIC } from './style-guide.js';

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
    voice: z.number().min(0).max(10).default(7).describe('Third-person narration quality, cinematic distance'),
    choices: z.number().min(0).max(10).default(7).describe('Distinct, meaningful choices (N/A for endings)'),
    pov_compliance: z.number().min(0).max(10).default(7).describe('Adherence to PoV style guide')
  }).default({ immersion: 7, pacing: 7, voice: 7, choices: 7, pov_compliance: 7 }),

  // For REWRITE - specific improvements needed
  rewrite_instructions: z.string().optional(),

  // For REGENERATE - why the scene should be completely redone
  regenerate_reason: z.string().optional(),

  // Brief explanation of the decision
  reason: z.string().default('Scene evaluated'),

  // PoV analysis
  pov_analysis: z.object({
    third_person_percentage: z.number().min(0).max(100).default(70).describe('Estimated % in third-person'),
    second_person_contained: z.boolean().default(true).describe('Is second-person only at decision points?'),
    first_person_restrained: z.boolean().default(true).describe('Is first-person absent or very brief?'),
    feels_observational: z.boolean().default(true).describe('Does listener feel like observer, not interrogated?')
  }).optional()
});

export type CYOAEditorOutput = z.infer<typeof CYOAEditorOutputSchema>;

/**
 * CYOA Editor Agent - ensures scene quality and PoV compliance
 *
 * Evaluates scenes against the Chronicle PoV Style Guide:
 * 1. Third-person dominance (70-80%)
 * 2. Second-person containment (choice framing only)
 * 3. First-person restraint (rare, brief)
 * 4. Prose quality (immersion, pacing, voice)
 * 5. Choice design (distinct, meaningful options)
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
Protagonist: ${state.player.name}
Scene type: ${sceneType}

## TARGET WORD COUNT
${state.diamond_config.words_per_scene.min}-${state.diamond_config.words_per_scene.max} words

## SCENE CONTENT
${rawContent}

${choiceSection}

---

${buildEditorStyleChecklist()}

---

Evaluate this scene for an interactive ${state.genre} story.

Word count: ${rawContent.split(/\s+/).length} words

Quality criteria:
1. IMMERSION: Does it use sensory details? Is the world vivid?
2. PACING: Does it move forward? Is the length appropriate?
3. VOICE: Is the third-person narration cinematic and engaging?
4. CHOICES: Are the options distinct and meaningful? (Skip if ending)
5. POV_COMPLIANCE: Does it follow the PoV style guide above?

PoV Analysis - check for:
- Is 70-80% in close third-person narration?
- Is "you" (second-person) used ONLY at choice framing?
- Is first-person absent or very brief (1-3 sentences)?
- Would a listener feel relaxed (observational) or interrogated?

Decision guidelines:
- ACCEPT if quality scores average 7+ and PoV is compliant
- REWRITE if prose is good but PoV violations need fixing
- REGENERATE if fundamentally flawed (wrong PoV throughout, boring, no stakes)

Respond with JSON.`;
  }

  /**
   * Calculate average quality score
   */
  static averageQuality(output: CYOAEditorOutput): number {
    const q = output.quality;
    return (q.immersion + q.pacing + q.voice + q.choices + q.pov_compliance) / 5;
  }

  /**
   * Quick check if scene passes minimum quality
   */
  static passesMinimumQuality(output: CYOAEditorOutput, threshold: number = 6): boolean {
    const q = output.quality;
    return q.immersion >= threshold &&
           q.pacing >= threshold &&
           q.voice >= threshold &&
           q.pov_compliance >= threshold;
  }

  /**
   * Check if PoV is compliant
   */
  static isPovCompliant(output: CYOAEditorOutput): boolean {
    if (!output.pov_analysis) return output.quality.pov_compliance >= 6;
    const p = output.pov_analysis;
    return p.third_person_percentage >= 60 &&
           p.second_person_contained &&
           p.first_person_restrained &&
           p.feels_observational;
  }
}

/**
 * System prompt for CYOA Editor
 */
const CYOA_EDITOR_SYSTEM_PROMPT = `You are the Quality Editor for interactive audio fiction (CYOA stories).

${GUIDING_SENTENCE}

Your job is to evaluate scene quality and ensure compliance with the Chronicle PoV Style Guide.

## CRITICAL: PoV Style Guide Compliance

### PRIMARY: Close Third-Person (70-80% of content)
- Narrate actions, thoughts, and sensations of the protagonist
- Maintain cinematic distance - show, don't tell emotions
- Sensory but not frantic descriptions
- Let actions imply emotion
- This is the DEFAULT for most of the scene

### DECISION MOMENTS: Second-Person (Choice Framing Only)
- Use "you" ONLY in the 1-2 sentences immediately before choices
- Never for extended narration
- A signal, not a style
- Return to third-person immediately after choice resolves

### SPECIAL EFFECT: First-Person (Rare)
- Maximum 1-3 sentences per scene
- Only for: panic, stress, confession, climax
- Must immediately transition back to third-person
- Often better to omit entirely

### PoV Quality Check
${QUALITY_HEURISTIC.correct}
${QUALITY_HEURISTIC.wrong}

---

## Evaluation Criteria

### IMMERSION (0-10)
- Sensory details (sight, sound, smell, touch)
- Vivid, concrete descriptions
- World feels real and present
- 0 = generic/abstract, 10 = fully immersive

### PACING (0-10)
- Scene moves the story forward
- Appropriate length for content
- Tension builds before decisions
- 0 = static/dragging, 10 = perfect momentum

### VOICE (0-10)
- Third-person narration is cinematic and engaging
- Present tense for immediacy
- Actions imply emotion (no "he felt sad")
- 0 = distancing/awkward, 10 = intimate and compelling

### CHOICES (0-10) - Skip for endings
- Options feel meaningfully different
- No obviously "correct" answer
- Each choice implies different outcomes
- Phrased as actions, not "go left/right"
- 0 = arbitrary, 10 = agonizing decision

### POV_COMPLIANCE (0-10)
- 70-80% in close third-person
- Second-person contained to choice framing
- First-person absent or very brief
- Listener feels observational, not interrogated
- 0 = wrong PoV throughout, 10 = perfect compliance

## Decision Guidelines

**ACCEPT** if:
- Average quality >= 7
- No score below 5
- PoV compliance score >= 7
- Provide edited version (tighten 10-15%)

**REWRITE** if:
- Quality is 5-7 average
- PoV violations that can be fixed
- Specific improvements would help
- Provide detailed rewrite instructions focused on PoV fixes

**REGENERATE** if:
- Quality below 5 average
- Written entirely in wrong PoV (all second-person or all first-person)
- Scene is fundamentally boring or static
- Would be faster to start over
- Explain what's wrong

## Output Requirements

For ACCEPT:
- Provide edited_content with tightened prose
- Ensure PoV is correct (fix minor violations)
- Cut filler words, strengthen verbs
- Trim 10-15% while preserving meaning

For REWRITE:
- Provide specific rewrite_instructions
- Note PoV violations and how to fix them
- Give examples of correct PoV where helpful

For REGENERATE:
- Provide regenerate_reason
- Explain why the scene fails (especially PoV issues)
- Note what the new version should focus on

Be ruthless about PoV compliance. Players deserve an observational, immersive experience.`;

/**
 * Polished mode system prompt addition
 */
export const CYOA_POLISHED_PROMPT_ADDITION = `
## POLISHED MODE ACTIVE

You are in POLISHED mode. Higher standards apply:
- Minimum score threshold: 7 (not 6)
- Prose must be publication-quality
- PoV compliance must be perfect (8+)
- Choices must create genuine dilemmas
- Every word must earn its place

Tighten ruthlessly. Cut mercilessly. Polish until it shines.
The listener should be able to relax and observe.`;
