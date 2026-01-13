# CYOA - Choose Your Own Adventure

**Last Updated:** 2026-01-13
**Version:** 1.0

---

## Product Philosophy

### Core Insight

> "People vastly overestimate how much they want to create.
> They underestimate how much they want to decide."

CYOA optimizes for **agency** over **authorship**:

| Chronicle (Authorship) | CYOA (Agency) |
|------------------------|---------------|
| "This is mine. I made this." | "My choices matter." |
| Front-loaded decisions | Ongoing light decisions |
| Few deep sessions | Many short sessions |
| High pride, low return | High engagement, strong return |
| "Another book?" | "What if I chose differently?" |

### What Users Actually Want

**Authorship without responsibility:**
- Their name, their flavor, their identity
- But NOT blank pages, world consistency work, narrative coherence

**Decision-making over creation:**
- Being tested, seeing consequences
- Curiosity about outcomes
- Tension and relief

---

## Product Vision

**Core Promise:** *"Every choice matters. Every path is yours."*

CYOA delivers:
1. **Immediate engagement** - Hooked from the first choice
2. **Meaningful consequences** - Decisions visibly shape the story
3. **Replay compulsion** - "What if I had chosen differently?"
4. **Session-friendly** - 10-20 minute complete stories
5. **Personal touch** - Your name, your style, without creative burden

---

## Architecture Overview

| Component | Purpose | Stack | Deployment |
|-----------|---------|-------|------------|
| **CYOA App** | Frontend + Story UI | Next.js, Supabase | Vercel |
| **CYOA Engine** | Story generation + branching | Express, BullMQ, Prisma | Hetzner (46.224.188.200) |

### Key Technical Concepts

```
STORY = Collection of SCENES
SCENE = Narrative content + DECISION POINTS
DECISION = 2-4 choices that branch to other SCENES
PATH = Sequence of scenes player traversed
ENDING = Terminal scene with outcome summary
```

---

## Feature Roadmap

### Phase 1: Foundation (MVP)

**Goal:** Basic playable CYOA experience with AI-generated branching stories.

#### 1.1 Story Data Model

| Task | Priority | Status |
|------|----------|--------|
| Define `stories` table (title, genre, premise, settings) | High | Planned |
| Define `scenes` table (story_id, content, scene_type) | High | Planned |
| Define `decisions` table (scene_id, text, next_scene_id) | High | Planned |
| Define `playthroughs` table (user_id, story_id, path, ending) | High | Planned |
| Scene types: `intro`, `branch`, `consequence`, `ending` | High | Planned |
| Prisma schema for Engine | High | Planned |

#### 1.2 Story Engine (Backend)

| Task | Priority | Status |
|------|----------|--------|
| Story generation job queue (BullMQ) | High | Planned |
| Scene generation with Claude | High | Planned |
| Decision point generation (2-4 choices) | High | Planned |
| Branching logic (DAG structure) | High | Planned |
| Ending generation based on path | High | Planned |
| `POST /v1/stories` - Create story | High | Planned |
| `GET /v1/stories/:id` - Get story tree | High | Planned |
| `GET /v1/stories/:id/scene/:sceneId` - Get scene | High | Planned |

#### 1.3 Player UI (Frontend)

| Task | Priority | Status |
|------|----------|--------|
| Story intro screen (premise, setting, your role) | High | Planned |
| Scene display (narrative text) | High | Planned |
| Decision buttons (2-4 choices) | High | Planned |
| Choice confirmation (brief pause before reveal) | High | Planned |
| Progress indicator (scenes traversed) | High | Planned |
| Ending screen (outcome summary) | High | Planned |

#### 1.4 Genre Templates

| Task | Priority | Status |
|------|----------|--------|
| Fantasy Adventure template | High | Planned |
| Mystery/Detective template | High | Planned |
| Sci-Fi Survival template | High | Planned |
| Romance template | Medium | Planned |
| Horror template | Medium | Planned |

---

### Phase 2: Personalization

**Goal:** Make the story feel personal without requiring creative effort.

#### 2.1 Quick Customization

| Task | Priority | Status |
|------|----------|--------|
| Character name input | High | Planned |
| Gender selection | High | Planned |
| 3-word personality descriptor | High | Planned |
| Tone slider (Light/Balanced/Dark) | High | Planned |
| Difficulty slider (Forgiving/Normal/Punishing) | Medium | Planned |

#### 2.2 Adaptive Content

| Task | Priority | Status |
|------|----------|--------|
| Name injection in narrative | High | Planned |
| Personality-influenced descriptions | Medium | Planned |
| Tone-adjusted consequences | Medium | Planned |

---

### Phase 3: Engagement & Replay

**Goal:** Build the "one more play" compulsion and replay motivation.

#### 3.1 Endings System

| Task | Priority | Status |
|------|----------|--------|
| Multiple endings per story (3-7) | High | Planned |
| Ending quality tiers (Bad/Neutral/Good/Best) | High | Planned |
| Ending unlock tracking | High | Planned |
| "X of Y endings discovered" display | High | Planned |
| Hidden/secret endings | Medium | Planned |

#### 3.2 Path Tracking

| Task | Priority | Status |
|------|----------|--------|
| Decision history per playthrough | High | Planned |
| "Pivotal moment" markers | High | Planned |
| Path comparison (your path vs others) | Medium | Planned |
| Choice statistics ("42% chose this") | Medium | Planned |

#### 3.3 Replay Features

| Task | Priority | Status |
|------|----------|--------|
| Quick restart (same story) | High | Planned |
| "Try different path" from any decision | High | Planned |
| Bookmark decisions for later | Medium | Planned |
| Share specific paths | Medium | Planned |

---

### Phase 4: Audio & Immersion

**Goal:** Enable passive consumption (listening while commuting/exercising).

| Task | Priority | Status |
|------|----------|--------|
| Scene narration via ElevenLabs | High | Planned |
| Voice selection per story | High | Planned |
| Audio decision prompts | High | Planned |
| Background ambient sounds | Medium | Planned |
| Continuous playback with choice pauses | High | Planned |

---

### Phase 5: Social & Discovery

**Goal:** Transform from tool to content network.

#### 5.1 Story Library

| Task | Priority | Status |
|------|----------|--------|
| Public story library | High | Planned |
| Browse by genre, mood, length | High | Planned |
| Featured/staff picks | High | Planned |
| Trending stories (by plays) | Medium | Planned |
| "Most replayed" stories | Medium | Planned |

#### 5.2 Social Features

| Task | Priority | Status |
|------|----------|--------|
| Share ending card to social media | High | Planned |
| "Challenge a friend" (same story, compare paths) | High | Planned |
| Leaderboards (fastest to best ending) | Medium | Planned |
| Achievements/badges | Medium | Planned |

---

### Phase 6: Monetization

**Goal:** Sustainable business model that doesn't break immersion.

#### Option A: Free + Premium Stories

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | 3 stories/month, basic genres |
| Premium | $4.99/mo | Unlimited plays, all genres, audio |

#### Option B: Per-Story Credits

| Action | Credits |
|--------|---------|
| Play new story | 1 credit |
| Replay same story | Free |
| Credit pack (10) | $2.99 |
| Credit pack (50) | $9.99 |

---

## Technical Specifications

### Story Generation Pipeline

```
1. PREMISE     - User selects genre + tone + customization
2. WORLD       - AI generates setting, rules, key characters
3. STRUCTURE   - AI creates scene graph (intro - branches - endings)
4. CONTENT     - AI writes each scene with decisions
5. VALIDATION  - Check continuity, decision balance, ending variety
```

### Scene Graph (DAG)

```
                    +-- Scene B1 -- Scene C1 -- Ending 1
                    |
Intro -- Scene A ---+-- Scene B2 --+-- Scene C2 -- Ending 2
                    |              |
                    |              +-- Scene C3 -- Ending 3
                    |
                    +-- Scene B3 -- Scene C4 -- Ending 4
```

### Story Length Targets

| Type | Scenes | Decisions | Endings | Play Time |
|------|--------|-----------|---------|-----------|
| Quick | 5-8 | 3-5 | 2-3 | 5-10 min |
| Standard | 10-15 | 6-10 | 4-5 | 15-25 min |
| Epic | 20-30 | 15-20 | 6-8 | 40-60 min |

---

## What to Keep from Chronicle

### Keep (Adapt)

| Component | Chronicle Purpose | CYOA Adaptation |
|-----------|-------------------|-----------------|
| Chronicle Engine | Book generation | Story/scene generation |
| BullMQ job queue | Background processing | Same |
| PostgreSQL + Prisma | Data storage | Same |
| Caddy reverse proxy | HTTPS/routing | Same |
| Docker Compose | Deployment | Same |
| ElevenLabs TTS | Audio books | Scene narration |
| De-AI-ification | Quality prose | Quality scenes |
| Next.js frontend | Book UI | Story player UI |
| Supabase Auth | User management | Same |

### Delete

| Component | Reason |
|-----------|--------|
| Author Flow (`/dashboard`) | Users don't write in CYOA |
| Constitution system | Replace with simpler world rules |
| Chapter/section structure | Replace with scenes |
| Preview editing | No preview needed |
| Masterpiece mode | Single quality level |
| TipTap editor | No editing in CYOA |
| Embedding system | Simpler structure doesn't need it |
| PDF/EPUB export | Not applicable |
| Book sharing | Replace with ending sharing |

### Rename

| Chronicle | CYOA |
|-----------|------|
| `books` | `stories` |
| `chapters` | (removed) |
| `sections` | `scenes` |
| `vibe_jobs` | `story_jobs` |
| `/create` | `/play` |
| `/reader` | `/story` |

---

## Database Schema (CYOA)

### Core Tables

```sql
-- Stories (generated adventures)
stories (
  id, user_id, title, genre, premise,
  world_rules, tone, difficulty,
  total_scenes, total_endings,
  status, created_at
)

-- Scenes (individual story moments)
scenes (
  id, story_id, scene_type,
  content, character_state,
  scene_order, is_ending,
  ending_quality, created_at
)

-- Decisions (choices at each scene)
decisions (
  id, scene_id, text,
  consequence_hint, next_scene_id,
  choice_order, times_chosen
)

-- Playthroughs (user play sessions)
playthroughs (
  id, user_id, story_id,
  current_scene_id, path_taken,
  ending_id, completed_at,
  duration_seconds
)

-- User progress
user_progress (
  user_id, story_id,
  endings_unlocked, total_plays,
  best_ending, fastest_time
)
```

---

## API Routes

### Story Player (Frontend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stories` | GET | List available stories |
| `/api/stories/[id]` | GET | Get story metadata |
| `/api/stories/[id]/start` | POST | Start new playthrough |
| `/api/stories/[id]/scene/[sceneId]` | GET | Get scene content |
| `/api/stories/[id]/decide` | POST | Make a decision |
| `/api/playthroughs/[id]` | GET | Get playthrough state |

### Story Engine (Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /v1/stories` | POST | Create story generation job |
| `GET /v1/stories/:id` | GET | Get job status |
| `GET /v1/stories/:id/tree` | GET | Get full scene graph |
| `GET /health` | GET | Health check |

---

## Environment Variables

### Vercel (CYOA App)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ELEVENLABS_API_KEY
NEXT_PUBLIC_APP_URL
```

### Hetzner (CYOA Engine)

```
DATABASE_URL
REDIS_URL
ANTHROPIC_API_KEY
NODE_ENV
```

---

## Success Metrics

### Engagement (Primary)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Session length | 10-20 min | Sweet spot for mobile |
| Plays per user per week | 3+ | Habit formation |
| Replay rate | 40%+ | "What if" compulsion |
| Completion rate | 80%+ | Stories should be finishable |

### Retention (Secondary)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Day 1 retention | 40%+ | Hook worked |
| Day 7 retention | 25%+ | Building habit |
| Day 30 retention | 15%+ | Sustainable engagement |

### Virality (Growth)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Share rate | 20%+ | Endings worth sharing |
| Invite conversion | 30%+ | Friends try it |

---

## Changelog

### 2026-01-13
- Initial CYOA roadmap created
- Forked from Chronicle codebase
- Defined product philosophy (agency over authorship)
- Outlined 6-phase roadmap
- Identified keep/delete from Chronicle
- Designed database schema for branching stories
