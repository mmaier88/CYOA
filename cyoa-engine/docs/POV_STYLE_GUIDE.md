# Chronicle PoV Style Guide

**For Audio-First Interactive Stories**

> "Write interactive audio stories that are primarily observed, occasionally decided, and only rarely inhabited."

---

## Core Principle

Control cognitive load by separating narration from agency.

The listener should **observe most of the time** and **act only at deliberate moments**.

Audio has no skim, no pause-for-orientation. **PoV is your primary pacing tool.**

---

## Default PoV Strategy (Non-Negotiable)

### Primary Mode: Close Third-Person (70-80% of runtime)

This is the default for the vast majority of content.

**Why:**
- Reduces listener fatigue
- Allows atmosphere and world-building
- Creates emotional breathing room
- Avoids constant "decision pressure"

**Rules:**
- Narrate actions, thoughts, and sensations of the protagonist
- Avoid excessive interior monologue
- Maintain cinematic distance
- Let actions imply emotion
- Use sensory but not frantic descriptions

**Example:**
```
The corridor narrows as Elias moves forward.
The hum in the walls deepens — not loud, but persistent.
He slows, listening.
```

---

### Decision Moments: Second-Person (Agency Injection)

Second-person is used **ONLY at explicit decision points**.

Second-person is a **signal**, not a style.

**When to use:**
- Immediately before a choice
- Only for 1-2 sentences
- Never for extended narration

**Rules:**
- Use "you" only to frame the decision
- Never describe ongoing actions in second-person
- Always return to third-person immediately after the choice resolves

**Example:**
```
The room goes quiet.

What do you do?
1. Step closer
2. Stay where you are

[After selection → back to third-person:]

Elias steps forward. The floor creaks once — too loud.
```

---

### First-Person (Highly Restricted)

First-person is a **special effect**. It must not be the default.

**Allowed use cases:**
- Panic or extreme stress
- Confession or memory
- Dream or hallucination
- Final climactic moments
- Very short inner breaks (1-3 sentences)

**Hard limits:**
- Never longer than 30-60 seconds of audio (1-3 sentences)
- Never used for routine exploration
- Never used for entire scenes or chapters
- Must immediately transition back to third-person

**Example (acceptable):**
```
I shouldn't have come here.
The thought hits too late.

[Immediately transition out:]

The thought passes. Elias steadies himself.
```

---

## PoV Rhythm Rules (Critical)

### What NOT to do:
- Continuous first-person narration
- Switching PoV mid-sentence
- Using "you" casually outside choices
- Making the listener feel "on call" constantly

### What to do:
- Long third-person stretches
- Clear transitions into decision mode
- Clear release after decisions
- Predictable rhythm: **Observe → Tension → Decide → Observe**

---

## Cognitive Load Budget (Audio-Specific)

**Maximum allowed decision frequency:**
- 1 decision every 3-5 minutes
- Never back-to-back decisions
- Never interrupt emotional payoff with a decision

**Quality test:**
> If the listener feels "I'm always waiting for the next choice" — you are overusing agency.

---

## Language & Tone Guidelines

### Third-Person Narration
- Sensory but not frantic
- Concrete descriptions
- Minimal "he thinks / he feels" phrasing
- Let actions imply emotion

### Second-Person (Decision Framing)
- Short
- Direct
- Neutral
- No emotional manipulation

### First-Person
- Sharp
- Sparse
- High emotional intensity
- Immediate exit

---

## Example: Correct PoV Flow (End-to-End)

**Narration (3rd person)**
```
Rain streaks the platform glass as the train slows.
Elias doesn't move. The briefcase vibrates once.
```

**Transition to agency (2nd person)**
```
What do you do?
1. Open the briefcase
2. Ignore it
```

**Resolution (3rd person)**
```
He opens the case. Inside, a phone — already ringing.
```

**Momentary spike (1st person, optional)**
```
This is wrong.
```

**Immediate return (3rd person)**
```
The thought fades as the call connects.
```

---

## Implementation Checklist

### The generator MUST:
- [ ] Default to close third-person narration
- [ ] Use second-person only to frame explicit choices
- [ ] Treat first-person as a rare, high-impact tool
- [ ] Enforce spacing between decisions
- [ ] Return to third-person after every choice
- [ ] Create long third-person stretches
- [ ] Use clear transitions into and out of decision mode
- [ ] Maintain predictable rhythm: Observe → Tension → Decide → Observe

### The generator MUST NOT:
- [ ] Write entire scenes in first-person
- [ ] Address the listener as "you" outside decisions
- [ ] Ask questions during narration
- [ ] Create constant anticipation of choice
- [ ] Use continuous first-person narration
- [ ] Switch PoV mid-sentence
- [ ] Use "you" casually outside choices
- [ ] Make the listener feel "on call" constantly
- [ ] Use excessive "he thinks / he feels" phrasing

---

## Quality Heuristic

**Simple rule:**

> If the listener feels like they can **relax while listening**, PoV is correct.
> If they feel **interrogated**, PoV is wrong.

---

## Technical Implementation

The style guide is implemented in:
- `packages/core/src/cyoa/style-guide.ts` - Configuration and prompt builders
- `packages/core/src/cyoa/orchestrator.ts` - Scene generation prompts
- `packages/core/src/cyoa/editor.ts` - Quality evaluation

### Key Functions

```typescript
import {
  buildStyleGuidePrompt,      // Full style guide for prompts
  buildCondensedStyleGuide,   // Condensed version (saves tokens)
  buildEditorStyleChecklist,  // Checklist for editor evaluation
  GUIDING_SENTENCE,           // Core principle sentence
  POV_CONFIG,                 // PoV configuration object
  DECISION_PACING,            // Decision timing rules
  MUST_DO,                    // Array of requirements
  MUST_NOT                    // Array of prohibitions
} from '@chronicle/core';
```

### Modifying the Style Guide

To customize the style guide:

1. Edit `packages/core/src/cyoa/style-guide.ts`
2. Rebuild the core package: `npm run build --workspace=packages/core`
3. Restart the worker to pick up changes

---

## Version History

- **v1.0** (2024-01-14): Initial implementation based on Chronicle PoV Style Guide
