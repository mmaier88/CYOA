# CYOA - Claude Code Context

## Project Overview

CYOA is an AI-powered interactive story platform that optimizes for **agency over authorship**. Users make decisions that shape branching narratives with multiple endings.

**Core Philosophy:**
- "People underestimate how much they want to decide."
- Immediate engagement from the first choice
- Meaningful consequences that visibly shape the story
- Strong replay compulsion ("What if I chose differently?")

**Tech Stack:**
- **Frontend:** Next.js, React, TailwindCSS, Supabase Auth
- **Backend Engine:** Express, BullMQ, Prisma, PostgreSQL
- **AI:** Anthropic Claude (story/scene generation)
- **Audio:** ElevenLabs TTS
- **Hosting:** Vercel (frontend) + Hetzner (engine at 46.224.188.200)

## Project Structure

```
/app                    # Next.js frontend (Vercel)
  /src
    /app               # expo-router pages
    /components        # Shared components
    /lib               # Utilities, types, services

/cyoa-engine           # Story generation backend (Hetzner)
  /apps
    /api               # Express API
  /packages
    /core              # Shared generation logic
  /infra               # Docker, Caddy configs
  /prisma              # Database schema

/supabase              # Frontend database migrations
```

## Key Concepts

```
STORY    = Collection of SCENES with branching paths
SCENE    = Narrative content + DECISION POINTS
DECISION = 2-4 choices that branch to other SCENES
PATH     = Sequence of scenes player traversed
ENDING   = Terminal scene with outcome summary
```

## Development Commands

### Frontend

```bash
cd app
npm install
npm run dev        # Development server
npm run build      # Production build
npm run type-check # TypeScript checking
```

### Engine

```bash
cd cyoa-engine
npm install
npm run dev        # Development server
npm run build      # Build for production
```

### Deployment

```bash
# Frontend (Vercel)
vercel --prod

# Engine (Hetzner - 46.224.188.200)
ssh root@46.224.188.200
cd /opt/cyoa && docker compose up -d --build
```

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_APP_URL=https://cyoa.app
```

### Engine (.env)

```env
POSTGRES_PASSWORD=
CYOA_API_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
DATABASE_URL=postgresql://cyoa:${POSTGRES_PASSWORD}@postgres:5432/cyoa
REDIS_URL=redis://redis:6379
```

## Server Access (Hetzner)

**CYOA Server:** 46.224.188.200
- SSH: `ssh root@46.224.188.200`
- Docker Compose: `/opt/cyoa/docker-compose.yml`
- API (Production): Port 80
- API (Staging): Port 3001

## Database Schema (CYOA)

```sql
-- Stories (generated adventures)
stories (id, user_id, title, genre, premise, world_rules, tone, difficulty,
         total_scenes, total_endings, status, created_at)

-- Scenes (individual story moments)
scenes (id, story_id, scene_type, content, character_state,
        scene_order, is_ending, ending_quality, created_at)

-- Decisions (choices at each scene)
decisions (id, scene_id, text, consequence_hint, next_scene_id,
           choice_order, times_chosen)

-- Playthroughs (user play sessions)
playthroughs (id, user_id, story_id, current_scene_id, path_taken,
              ending_id, completed_at, duration_seconds)

-- User progress
user_progress (user_id, story_id, endings_unlocked, total_plays,
               best_ending, fastest_time)
```

## API Routes

### Frontend (Vercel)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stories` | GET | List available stories |
| `/api/stories/[id]` | GET | Get story metadata |
| `/api/stories/[id]/start` | POST | Start new playthrough |
| `/api/stories/[id]/scene/[sceneId]` | GET | Get scene content |
| `/api/stories/[id]/decide` | POST | Make a decision |
| `/api/playthroughs/[id]` | GET | Get playthrough state |

### Engine (Hetzner)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/stories` | POST | Create story generation job |
| `/v1/stories/:id` | GET | Get job status |
| `/v1/stories/:id/tree` | GET | Get full scene graph |
| `/health` | GET | Health check |

## Story Generation Pipeline

```
1. PREMISE     - User selects genre + tone + customization
2. WORLD       - AI generates setting, rules, key characters
3. STRUCTURE   - AI creates scene graph (intro → branches → endings)
4. CONTENT     - AI writes each scene with decisions
5. VALIDATION  - Check continuity, decision balance, ending variety
```

## Code Style

- No emojis in code unless explicitly requested
- Prefer editing existing files over creating new ones
- Keep solutions simple - no over-engineering
- Focus on agency (decision-making), not authorship (creation)
- Session-friendly: target 10-20 minute complete stories

## 1Password Secrets (use `op` CLI)

```bash
# Get Anthropic API key
op item get "anthropic" --vault "Ai" --fields "api_key" --reveal

# Get Supabase service role key
op item get "supabase-cyoa" --vault "Ai" --fields "service_role_key" --reveal
```

## Important Notes

- CYOA is NOT Chronicle - it's about agency, not authorship
- Users don't create, they decide
- Every choice should feel meaningful
- Endings should be shareable achievements
- Replay is the core loop, not one-and-done usage
