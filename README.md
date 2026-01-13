# CYOA - Choose Your Own Adventure

**AI-powered interactive story platform** - Every choice matters. Every path is yours.

## Product Philosophy

> "People vastly overestimate how much they want to create.
> They underestimate how much they want to decide."

CYOA optimizes for **agency** over **authorship**:
- Immediate engagement from the first choice
- Meaningful consequences that visibly shape the story
- Strong replay compulsion ("What if I chose differently?")
- Session-friendly 10-20 minute stories

## Features

- **AI Story Generation** - Branching narratives with multiple endings
- **Quick Customization** - Name, personality, tone (no creative burden)
- **Decision Points** - 2-4 choices that matter
- **Multiple Endings** - 3-7 endings per story, tracked
- **Replay System** - Try different paths, see choice statistics
- **Audio Narration** - ElevenLabs TTS for passive consumption
- **Social Sharing** - Share endings, challenge friends

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TailwindCSS |
| Backend | Next.js API Routes + CYOA Engine |
| Database | PostgreSQL (Supabase + Prisma) |
| Auth | Supabase Auth + Google OAuth |
| AI | Anthropic Claude (story generation) |
| Audio | ElevenLabs TTS |
| Hosting | Vercel (app) + Hetzner (engine) |

## Architecture

```
CYOA/
├── app/                    # Next.js frontend (Vercel)
│   ├── src/
│   │   ├── app/           # Pages and API routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities and services
│   │   └── types/         # TypeScript types
│   └── package.json
├── cyoa-engine/           # Story generation backend (Hetzner)
│   ├── apps/
│   │   └── api/           # Express API
│   ├── packages/
│   │   └── core/          # Shared logic
│   └── prisma/            # Database schema
├── supabase/
│   └── migrations/        # Frontend database
└── ROADMAP.md             # Features and roadmap
```

## Key Concepts

```
STORY    = Collection of SCENES with branching paths
SCENE    = Narrative content + DECISION POINTS
DECISION = 2-4 choices that branch to other SCENES
PATH     = Sequence of scenes player traversed
ENDING   = Terminal scene with outcome summary
```

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- API keys: Anthropic, ElevenLabs (optional)

### Environment Variables

**Frontend (app/.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key
NEXT_PUBLIC_APP_URL=https://cyoa.app
```

**Engine (cyoa-engine/infra/.env):**
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ANTHROPIC_API_KEY=your_anthropic_key
```

### Installation

```bash
# Frontend
cd app
npm install
npm run dev

# Engine (local)
cd cyoa-engine
npm install
npm run dev
```

## API Routes

### Story Player (Frontend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stories` | GET | List available stories |
| `/api/stories/[id]` | GET | Get story metadata |
| `/api/stories/[id]/start` | POST | Start new playthrough |
| `/api/stories/[id]/scene/[sceneId]` | GET | Get scene content |
| `/api/stories/[id]/decide` | POST | Make a decision |

### Story Engine (Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /v1/stories` | POST | Create story generation job |
| `GET /v1/stories/:id` | GET | Get job status |
| `GET /v1/stories/:id/tree` | GET | Get full scene graph |
| `GET /health` | GET | Health check |

## Deployment

**Frontend:** Vercel (automatic from main branch)
**Engine:** Hetzner (46.224.188.200) via Docker Compose

## Development

```bash
# Run frontend
cd app && npm run dev

# Run engine locally
cd cyoa-engine && npm run dev

# Type checking
npm run type-check

# Build
npm run build
```

## License

Proprietary - All rights reserved.

## Links

- [Roadmap](./ROADMAP.md)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com)
