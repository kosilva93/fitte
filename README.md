# Fitte — AI Personal Stylist & Wardrobe Architect

An AI-powered personal styling app that helps you maximize your wardrobe, compose outfits using color theory, and identify smart purchases — all tailored to your style, budget, and local context.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo (iOS & Android) |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Claude (claude-sonnet-4-6) via Anthropic SDK |
| Image Classification | Clarifai (fashion model) |
| Subscriptions | RevenueCat |
| Trends | RSS feed scraping + Pinterest API |
| Hosting | Railway (API) + Expo EAS (builds) |

## Prerequisites

- Node.js >= 20
- Yarn >= 1.22
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [Clarifai](https://clarifai.com) account
- A [RevenueCat](https://revenuecat.com) account

## Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/your-org/fitte
cd fitte
make install

# 2. Set up environment variables
make setup-env
# Then fill in apps/api/.env and apps/mobile/.env with your actual keys

# 3. Run the API schema migrations
# Paste the DDL from docs/schema.sql into your Supabase SQL editor

# 4. Start development
make dev-api       # terminal 1 — API on http://localhost:3000
make dev-mobile    # terminal 2 — Expo on localhost:19006
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies |
| `make dev-api` | Start API with hot reload |
| `make dev-mobile` | Start Expo dev server |
| `make test` | Run all tests |
| `make lint` | Lint all workspaces |
| `make format` | Format all workspaces |
| `make typecheck` | TypeScript check all workspaces |
| `make build-api` | Compile API for production |
| `make build-mobile-preview` | EAS build for TestFlight/Play beta |
| `make build-mobile-production` | EAS build for App Store/Play Store |
| `make clean` | Remove all build artifacts |

## Project Structure

```
fitte/
├── apps/
│   ├── api/                    # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── routes/         # Express route handlers
│   │   │   ├── services/       # Business logic (Claude, Clarifai)
│   │   │   ├── middleware/     # Auth, error handling, tier gating
│   │   │   ├── jobs/           # Scheduled jobs (trend fetcher)
│   │   │   └── utils/          # Supabase client, logger
│   │   └── tests/
│   └── mobile/                 # Expo React Native app
│       ├── app/                # Expo Router file-based routes
│       │   ├── (auth)/         # Sign in / sign up screens
│       │   └── (tabs)/         # Main tab navigation
│       └── src/
│           ├── store/          # Zustand global state
│           ├── types/          # Shared TypeScript types
│           └── utils/          # Supabase client, API helpers
├── Makefile
└── package.json                # Yarn workspaces root
```

## Subscription Tiers

| Feature | Free | Pro ($9.99/mo) | Premium ($19.99/mo) |
|---------|------|----------------|---------------------|
| Wardrobe items | 10 | Unlimited | Unlimited |
| Outfit generations | 3/week | Unlimited | Unlimited |
| Gap analysis | — | ✓ | ✓ |
| Trends feed | — | — | ✓ |
| Pinterest integration | — | — | ✓ |

## Key Design Decisions

- **Direct-to-storage uploads** — wardrobe photos upload directly to Supabase Storage via signed URLs; the API is never a proxy for large files
- **Vitest for API tests** — faster than Jest, native ESM support, zero config with tsx
- **SecureStore for tokens** — Supabase session stored in Expo SecureStore, not AsyncStorage
- **Soft deletes on wardrobe_items** — items may still be referenced in saved outfits after deletion
- **RLS on every table** — data access enforced at the database level, not just application middleware
- **Idempotent webhook handler** — RevenueCat billing events are safe to replay
