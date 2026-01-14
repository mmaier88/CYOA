/**
 * Chronicle PoV Style Guide
 * For Audio-First Interactive Stories
 *
 * This module defines the narrative style rules for CYOA story generation.
 * Edit this file to customize the writing style.
 */

/**
 * Core principle that guides all style decisions
 */
export const CORE_PRINCIPLE = `Control cognitive load by separating narration from agency.
The listener should observe most of the time and act only at deliberate moments.
Audio has no skim, no pause-for-orientation. PoV is your primary pacing tool.`;

/**
 * The guiding sentence included in all prompts
 */
export const GUIDING_SENTENCE =
  `Write interactive audio stories that are primarily observed, occasionally decided, and only rarely inhabited.`;

/**
 * Point of View configuration
 */
export const POV_CONFIG = {
  /**
   * Close third-person is the default for 70-80% of runtime
   */
  thirdPerson: {
    usage: 'primary',
    percentage: '70-80%',
    purpose: [
      'Reduces listener fatigue',
      'Allows atmosphere and world-building',
      'Creates emotional breathing room',
      'Avoids constant "decision pressure"'
    ],
    rules: [
      'Narrate actions, thoughts, and sensations of the protagonist',
      'Avoid excessive interior monologue',
      'Maintain cinematic distance',
      'Let actions imply emotion',
      'Use sensory but not frantic descriptions',
      'Prefer concrete descriptions over abstract'
    ],
    tone: 'Sensory, concrete, cinematic distance'
  },

  /**
   * Second-person ONLY at explicit decision points
   */
  secondPerson: {
    usage: 'decision-framing-only',
    purpose: 'Signal that a choice is coming - it is a signal, not a style',
    rules: [
      'Use ONLY to frame explicit choices',
      'Limit to 1-2 sentences maximum',
      'Never for extended narration',
      'Never describe ongoing actions in second-person',
      'Always return to third-person immediately after choice resolves'
    ],
    tone: 'Short, direct, neutral - no emotional manipulation'
  },

  /**
   * First-person is a rare special effect
   */
  firstPerson: {
    usage: 'special-effect',
    maxDuration: '30-60 seconds of audio (1-3 sentences)',
    allowedUseCases: [
      'Panic or extreme stress',
      'Confession or memory',
      'Dream or hallucination',
      'Final climactic moments',
      'Very short inner breaks'
    ],
    hardLimits: [
      'Never longer than 30-60 seconds of audio',
      'Never for routine exploration',
      'Never for entire scenes or chapters',
      'Must immediately transition back to third-person'
    ],
    tone: 'Sharp, sparse, high emotional intensity, immediate exit'
  }
};

/**
 * Decision pacing rules - critical for audio experience
 */
export const DECISION_PACING = {
  frequency: {
    minimum: '3-5 minutes between decisions',
    rule: 'Never back-to-back decisions',
    exception: 'Never interrupt emotional payoff with a decision'
  },
  rhythm: [
    'Observe (third-person narration)',
    'Tension (build atmosphere)',
    'Decide (second-person choice frame)',
    'Observe (return to third-person)'
  ],
  cognitiveLoadTest: `If the listener feels "I'm always waiting for the next choice" - you are overusing agency.`
};

/**
 * What the generator MUST do
 */
export const MUST_DO = [
  'Default to close third-person narration',
  'Use second-person only to frame explicit choices',
  'Treat first-person as a rare, high-impact tool',
  'Enforce spacing between decisions',
  'Return to third-person after every choice',
  'Create long third-person stretches for observation',
  'Use clear transitions into and out of decision mode',
  'Maintain predictable rhythm: Observe → Tension → Decide → Observe'
];

/**
 * What the generator MUST NOT do
 */
export const MUST_NOT = [
  'Write entire scenes in first-person',
  'Address the listener as "you" outside decisions',
  'Ask questions during narration',
  'Create constant anticipation of choice',
  'Use continuous first-person narration',
  'Switch PoV mid-sentence',
  'Use "you" casually outside choices',
  'Make the listener feel "on call" constantly',
  'Use excessive "he thinks" / "he feels" phrasing'
];

/**
 * Internal heuristic for quality check
 */
export const QUALITY_HEURISTIC = {
  correct: 'If the listener feels like they can relax while listening, PoV is correct.',
  wrong: 'If they feel interrogated, PoV is wrong.'
};

/**
 * Example of correct PoV flow (for reference in prompts)
 */
export const POV_FLOW_EXAMPLE = `
## Example: Correct PoV Flow

**Narration (3rd person)**
Rain streaks the platform glass as the train slows.
Elias doesn't move. The briefcase vibrates once.

**Transition to agency (2nd person)**
What do you do?
1. Open the briefcase
2. Ignore it

**Resolution (3rd person)**
He opens the case. Inside, a phone — already ringing.

**Momentary spike (1st person, optional)**
This is wrong.

**Immediate return (3rd person)**
The thought fades as the call connects.
`;

/**
 * Build the complete style guide for inclusion in prompts
 */
export function buildStyleGuidePrompt(): string {
  return `
## Chronicle PoV Style Guide

${GUIDING_SENTENCE}

### Core Principle
${CORE_PRINCIPLE}

### Point of View Rules

**PRIMARY: Close Third-Person (${POV_CONFIG.thirdPerson.percentage} of content)**
${POV_CONFIG.thirdPerson.rules.map(r => `- ${r}`).join('\n')}

Tone: ${POV_CONFIG.thirdPerson.tone}

**DECISION MOMENTS: Second-Person (Choice Framing Only)**
${POV_CONFIG.secondPerson.rules.map(r => `- ${r}`).join('\n')}

Tone: ${POV_CONFIG.secondPerson.tone}

**SPECIAL EFFECT: First-Person (Rare, Max ${POV_CONFIG.firstPerson.maxDuration})**
Allowed only for: ${POV_CONFIG.firstPerson.allowedUseCases.join(', ')}
${POV_CONFIG.firstPerson.hardLimits.map(r => `- ${r}`).join('\n')}

Tone: ${POV_CONFIG.firstPerson.tone}

### Decision Pacing
- Minimum ${DECISION_PACING.frequency.minimum}
- ${DECISION_PACING.frequency.rule}
- Rhythm: ${DECISION_PACING.rhythm.join(' → ')}

### You MUST
${MUST_DO.map(r => `- ${r}`).join('\n')}

### You MUST NOT
${MUST_NOT.map(r => `- ${r}`).join('\n')}

### Quality Check
${QUALITY_HEURISTIC.correct}
${QUALITY_HEURISTIC.wrong}

${POV_FLOW_EXAMPLE}
`;
}

/**
 * Build a condensed version for scene-level prompts (saves tokens)
 */
export function buildCondensedStyleGuide(): string {
  return `
## PoV Rules (Critical)
- PRIMARY: Close third-person narration (70-80%). Cinematic, sensory, actions imply emotion.
- DECISIONS: Second-person ONLY to frame choices (1-2 sentences). Then immediately back to third-person.
- FIRST-PERSON: Rare special effect (1-3 sentences max) for panic/stress/climax only.
- NEVER: Write "you" outside choices. Never continuous first-person. Never back-to-back decisions.
- RHYTHM: Observe → Tension → Decide → Observe
- TEST: If listener can relax = correct. If interrogated = wrong.
`;
}

/**
 * Build style guide section for the Editor agent
 */
export function buildEditorStyleChecklist(): string {
  return `
## PoV Style Checklist (Evaluate Against These)

1. **Third-Person Dominance**: Is 70-80% of the scene in close third-person?
2. **Second-Person Containment**: Is "you" used ONLY in the 1-2 sentences framing the choice?
3. **First-Person Restraint**: If first-person appears, is it <3 sentences and high-impact?
4. **No PoV Drift**: Does it return to third-person immediately after decisions?
5. **No Interrogation**: Does the narration feel observational, not demanding?
6. **Cinematic Distance**: Are emotions shown through action, not stated?
7. **Decision Spacing**: Is there sufficient narrative between any consecutive choices?

**Quality Heuristic**: Would a listener feel they can relax, or feel constantly on-call?
`;
}
