# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**emodex** is a Next.js 16 + Mastra application. It combines a React 19 frontend (App Router), a REST API layer, Mastra AI agents/workflows, and a MySQL database accessed via Prisma.

Key capabilities:

- Streaming chat powered by Mastra agents (OpenAI Codex by default, mock fallback when no API key)
- Weather agent and workflow (Open-Meteo API, no key required)
- Groups and memberships API (CRUD, Auth0-authenticated)
- OpenAPI specification with Swagger UI
- PWA support (Service Worker notifications)

---

## Quick Start

```bash
nvm use                    # Node >= 22.12.0 required
npm install
cp .env.example .env       # fill in secrets
npm run db:up              # start MySQL 8.4 via Docker on port 3307
npm run db:generate        # generate Prisma client
npm run db:migrate         # apply migrations
npm run dev                # Next.js dev server → http://localhost:3000
```

Optional: seed 10 mock users:

```bash
npm run db:seed
```

---

## Technology Stack

| Layer              | Technology                                                                   |
| ------------------ | ---------------------------------------------------------------------------- |
| Language / Runtime | TypeScript + Node.js >= 22.12.0                                              |
| Frontend           | Next.js 16 + React 19 (App Router)                                           |
| AI / Agents        | Mastra (`@mastra/core`, `mastra`, `@mastra/memory`, `@mastra/observability`) |
| Database           | MySQL 8.4 (Docker) + Prisma 7                                                |
| Auth               | Auth0 (`@auth0/nextjs-auth0`)                                                |
| Styling            | Tailwind CSS v4 + PostCSS                                                    |
| PWA                | `next-pwa` + Service Worker (`public/push-sw.js`)                            |
| Validation         | Zod v4                                                                       |
| Testing            | Jest + Testing Library                                                       |
| Quality            | ESLint + Prettier + Husky + lint-staged                                      |

---

## Directory Structure

```
emodex/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Route entry points (thin — delegates to features/)
│   ├── layout.tsx
│   ├── globals.css
│   ├── manifest.ts
│   └── api/                  # Route Handlers (REST API)
│       ├── chat/stream/      # POST /api/chat/stream — Mastra streaming chat
│       ├── docs/             # GET /api/docs — Swagger UI
│       ├── groups/           # Groups & memberships CRUD
│       ├── cron/emo-snapshots/ # GET /api/cron/emo-snapshots — daily emo snapshot batch
│       ├── health/           # GET /api/health, /api/health/db
│       ├── users/verify/     # GET /api/users/verify/:email
│       └── v1/albums/        # Album endpoints (overview, insight, chart, dividend)
│
├── features/                 # Screen-level components (state + use-case logic)
│   ├── home/HomeFeature.tsx
│   └── health/HealthFeature.tsx
│
├── components/               # Reusable, display-only UI parts
│   ├── auth/                 # Login/Logout/Profile buttons, test components
│   ├── chat/                 # ChatForm, ChatResponse
│   ├── health/               # HealthStatus
│   └── notification/         # NotificationTest
│
├── mastra/                   # Mastra AI layer
│   ├── index.ts              # Mastra instance: registers agents, workflows, storage, logger, observability
│   ├── agents/
│   │   ├── chat-agent.ts     # chatAgent — OpenAI Codex, Memory enabled
│   │   └── weather-agent.ts  # weatherAgent — gpt-4o, uses weatherTool, Memory enabled
│   ├── tools/
│   │   └── weather-tool.ts   # get-weather tool (Open-Meteo geocoding + forecast)
│   └── workflows/
│       └── weather-workflow.ts  # fetchWeather → planActivities (uses weatherAgent)
│
├── lib/
│   ├── prisma.ts             # Singleton Prisma client
│   └── auth0.ts              # Auth0 client + onCallback hook (upserts user to DB)
│
├── prisma/
│   ├── schema.prisma         # Models: User, Group, Membership, MembershipRole enum
│   ├── prisma.config.ts      # Prisma config (references schema.prisma)
│   ├── seed.ts               # Seeds 10 mock users
│   └── migrations/           # SQL migration history
│
├── public/
│   ├── doc/api/openapi.yaml  # OpenAPI 3.1 spec (source of truth)
│   └── push-sw.js            # Service Worker for PWA push notifications
│
├── scripts/
│   └── validate-openapi.mjs  # Validates openapi.yaml with swagger-parser
│
├── docker/
│   └── mysql/init/01-grants.sql
│
├── .github/
│   ├── workflows/ci.yml      # CI: lint, format:check, openapi:validate (on PR to develop)
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example              # Environment variable template
├── next.config.ts            # Next.js config + PWA wrapper
├── tsconfig.json             # paths: @/* → ./*
├── eslint.config.mjs
├── jest.config.js
└── package.json
```

---

## npm Scripts Reference

| Script                       | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run dev`                | Next.js dev server (webpack mode)                          |
| `npm run build`              | Production build (runs `prisma generate` first)            |
| `npm run start`              | Start production server                                    |
| `npm run test`               | Run Jest tests                                             |
| `npm run test:watch`         | Jest in watch mode                                         |
| `npm run lint`               | ESLint                                                     |
| `npm run format`             | Prettier write                                             |
| `npm run format:check`       | Prettier check (used in CI)                                |
| `npm run openapi:validate`   | Validate `public/doc/api/openapi.yaml`                     |
| `npm run db:up`              | Start MySQL container                                      |
| `npm run db:down`            | Stop MySQL container                                       |
| `npm run db:logs`            | Tail MySQL logs                                            |
| `npm run db:generate`        | Generate Prisma client                                     |
| `npm run db:migrate`         | Apply pending migrations (deploy mode)                     |
| `npm run db:migrate:dev`     | Create + apply new migration (dev mode)                    |
| `npm run db:migrate:reset`   | Reset DB + re-run migrations                               |
| `npm run db:migrate:resolve` | Mark initial migration as applied (fixes post-reset drift) |
| `npm run db:seed`            | Seed 10 mock users                                         |
| `npm run db:studio`          | Prisma Studio UI                                           |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
PRE_RELEASE_LOCK=true           # Set false to open production traffic
DATABASE_URL="mysql://emodex:emodex@localhost:3307/emodex"

# Mastra chat — omit for mock fallback
OPENAI_API_KEY=""
OPENAI_MODEL="openai/gpt-5-codex"

# Auth0
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000

# Optional Mastra Cloud observability
MASTRA_CLOUD_ACCESS_TOKEN=

# Vercel Cron secret for /api/cron/* endpoints
CRON_SECRET=
```

`chatAgent` uses `OPENAI_MODEL` (default `openai/gpt-5-codex`). If `OPENAI_API_KEY` is absent, `POST /api/chat/stream` returns a hardcoded mock stream.

---

## Database

- **MySQL 8.4** runs in Docker on `localhost:3307` (container port 3306)
- Credentials: user `emodex`, password `emodex`, database `emodex`
- Managed by **Prisma 7** with `@prisma/adapter-mariadb`
- Persistent storage is in a Docker volume; use `docker compose down -v` to wipe it

### Schema Models

| Model        | Key fields                                                                                |
| ------------ | ----------------------------------------------------------------------------------------- |
| `User`       | `id`, `email` (unique), `name`, `picture?`, timestamps                                    |
| `Group`      | `id`, `groupName`, `adminUserId` → User, timestamps                                       |
| `Membership` | `id`, `userId`, `groupId`, `role` (ADMIN\|MEMBER), timestamps; unique `(userId, groupId)` |

### Migration Workflow

```bash
# Create and apply a new migration during development:
npm run db:migrate:dev -- --name <migration_name>

# Apply all pending migrations in CI / production:
npm run db:migrate
```

---

## Mastra AI Layer

All Mastra code lives in `mastra/`. The entry point `mastra/index.ts` creates the `Mastra` instance and wires together agents, workflows, storage (LibSQL file), logger (Pino), and observability.

### Agents

| Agent          | File                             | Model                                             | Tools         | Notes                                         |
| -------------- | -------------------------------- | ------------------------------------------------- | ------------- | --------------------------------------------- |
| `chatAgent`    | `mastra/agents/chat-agent.ts`    | `OPENAI_MODEL` env (default `openai/gpt-5-codex`) | none          | Memory enabled; used by streaming chat API    |
| `weatherAgent` | `mastra/agents/weather-agent.ts` | `openai/gpt-4o`                                   | `weatherTool` | Memory enabled; used inside `weatherWorkflow` |

### Tools

| Tool                          | File                           | Description                                                                 |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `weatherTool` (`get-weather`) | `mastra/tools/weather-tool.ts` | Fetches current weather for a city via Open-Meteo geocoding + forecast APIs |

### Workflows

| Workflow          | File                                   | Steps                                                                               |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `weatherWorkflow` | `mastra/workflows/weather-workflow.ts` | `fetchWeather` → `planActivities` (streams activity suggestions via `weatherAgent`) |

### Adding a New Agent

1. Create `mastra/agents/my-agent.ts` exporting a `new Agent({...})`
2. Import and register it in `mastra/index.ts` under `agents: { ..., myAgent }`

### Adding a New Tool

1. Create `mastra/tools/my-tool.ts` using `createTool` from `@mastra/core/tools`
2. Use Zod for `inputSchema` / `outputSchema`
3. Add the tool to the relevant agent's `tools` object

---

## Frontend Architecture (App Router 3-Layer Pattern)

```
app/**/page.tsx     →  thin routing shell, renders a Feature component
features/**         →  screen root (XxxFeature.tsx): state, use-case logic, composes components
components/**       →  reusable, display-only UI parts
```

**Rules:**

- `page.tsx` files must only import and render their `Feature` component — no logic.
- `features/` orchestrates state and API calls; imports from `components/`.
- `components/` must not import from `features/` (one-way dependency).
- New pages → create `features/<page>/XxxFeature.tsx`, then delegate from `app/**/page.tsx`.

---

## API Design Conventions

- Route Handlers live in `app/api/**`
- Auth context is passed via `X-User-Id` header (resolved from Auth0 session externally)
- `requireUser(request)` in `app/api/groups/common.ts` validates the header and fetches the DB user
- Input is validated with Zod; use `safeParse` and return `400` on failure
- Use `NextResponse.json()` for JSON responses; `jsonError(message, status)` for errors
- Transactions use `prisma.$transaction(async (tx) => {...})`
- The OpenAPI spec in `public/doc/api/openapi.yaml` must be kept in sync with route handler changes; run `npm run openapi:validate` to verify

---

## Authentication (Auth0)

- `lib/auth0.ts` creates the `Auth0Client` with an `onCallback` hook
- On successful login the hook upserts the user into the `User` table (`email` as unique key)
- Profile picture and name are synced from Auth0 on every login
- Components: `LoginButton`, `LogoutButton`, `Profile` in `components/auth/`

---

## Observability

Mastra is configured with:

- `PinoLogger` (name `Mastra`, level `info`) → structured logging
- `LibSQLStore` → persists traces/scores to `mastra.db` (local file)
- `DefaultExporter` → persists traces to storage (visible in Mastra Studio)
- `CloudExporter` → sends traces to Mastra Cloud if `MASTRA_CLOUD_ACCESS_TOKEN` is set
- `SensitiveDataFilter` → redacts passwords, tokens, keys from spans

---

## PWA / Notifications

- `next-pwa` wraps `next.config.ts`; PWA is disabled in development
- Service Worker registered at `/push-sw.js`
- `HomeFeature` detects PWA standalone mode via `display-mode: standalone` / `navigator.standalone`
- In browser: uses `Notification` API directly
- In PWA: posts `SHOW_NOTIFICATION` message to Service Worker
- Web Push infrastructure (VAPID, subscription management) is not yet implemented

---

## Cron Jobs

| Job           | Schedule    | Endpoint                      | Description                                                                    |
| ------------- | ----------- | ----------------------------- | ------------------------------------------------------------------------------ |
| Emo Snapshots | Daily 00:00 | `GET /api/cron/emo-snapshots` | Calculates and upserts daily emo value snapshots for all active photo storages |

- Configured in `vercel.json` for Vercel Cron
- Protected by `Authorization: Bearer ${CRON_SECRET}` header
- Idempotent: uses upsert keyed on `(photoStorageId, snapshotDate)`

---

## Quality Gates & CI

CI runs on PRs targeting `develop` branch (`.github/workflows/ci.yml`):

1. **Lint** — `npm run lint`
2. **Format** — `npm run format:check`
3. **OpenAPI** — `npm run openapi:validate`

Pre-commit hook (Husky + lint-staged) runs Prettier on staged `js/ts/json/css/md` files.

**Before opening a PR, run locally:**

```bash
npm run lint
npm run format:check
npm run openapi:validate
```

---

## Pull Request Conventions

Use `.github/PULL_REQUEST_TEMPLATE.md` without changing its section structure. Fill in:

- **目的** (Purpose): what the PR enables
- **方針** (Approach): design decisions and trade-offs
- **実装** (Implementation, optional): implementation notes for reviewers
- **テスト** (Tests): evidence that the change works
- **相談・気持ち** (Discussion, optional): uncertainties or alternative ideas

---

## TypeScript Path Aliases

`@/*` maps to the project root. Use `@/` for all internal imports:

```ts
import { prisma } from '@/lib/prisma';
import { mastra } from '@/mastra';
import HomeFeature from '@/features/home/HomeFeature';
```

---

## Definition of Done

- `npm run lint` passes
- `npm run format:check` passes (or `npm run format` applied and re-checked)
- `npm run openapi:validate` passes if any API routes changed
- Changes are scoped to the minimum necessary for the task
- Touched documentation is updated in the same PR
- JSDoc only where intent is non-obvious; avoid on trivial functions
- No new `dist/` output expected; Next.js builds to `.next/`
