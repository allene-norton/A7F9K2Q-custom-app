# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Copilot/Assembly custom app** for Maintenance Matters, built with Next.js 14 (App Router). It provides property maintenance assessment and work order management functionality, embedded within the Copilot/Assembly platform dashboard.

## Development Commands

```bash
yarn install              # Install dependencies
yarn dev                  # Local dev (standalone)
yarn dev:embedded         # Local dev with ngrok tunnel (for Copilot dashboard embedding)
yarn build                # Production build
yarn lint                 # ESLint
```

**Node.js 22.x required**

## Environment Setup

Required env vars in `.env.local`:
- `COPILOT_API_KEY` - From Copilot dashboard app setup

For embedded development (ngrok), add to `.env.personal`:
- `NGROK_AUTH_TOKEN` - From ngrok dashboard

## Architecture

### Route Structure
- `/internal/*` - Internal team dashboard (staff views)
- `/customer/*` - Client portal pages (customer views)
- `/api/*` - Next.js API routes

### Key Integrations

**Assembly/Copilot SDK** (`src/lib/assembly/client.ts`)
- Server actions wrapping `copilot-node-sdk`
- Handles clients, companies, forms, contracts, file channels
- Uses session tokens passed via `searchParams.token`
- Has dev/prod mode toggle (currently hardcoded `isDev = false`)

**ClickUp Integration** (`src/app/api/clickup/*`)
- Tasks, assessments, customers, webhooks
- Server actions in `src/lib/clickup/clickup_actions.ts`

### Authentication Pattern
- Session tokens passed via URL query param `?token=xxx`
- `TokenGate` component enforces token requirement in production
- `getSession()` helper (`src/utils/session.ts`) parses token and fetches user context

### Component Organization
- `src/components/ui/` - shadcn/ui components (Radix-based)
- `src/components/internal/` - Internal dashboard components
- Domain types in `src/types/types-index.ts`

### Styling
- Tailwind CSS 4 with `@tailwindcss/postcss`
- `copilot-design-system` CSS imported in root layout
- Brand color: `#174887`

## CSP Configuration

Content Security Policy is configured in `src/middleware.ts`. Add custom domains to `frame-ancestors` when embedding in custom portals.

## Data Types

Core domain models in `src/types/types-index.ts`:
- `Customer` - Property/company with ClickUp ID
- `Assessment` - Collection of inspection items with status workflow (draft/sent/approved)
- `AssessmentItem` - Individual findings with category, cost estimates, images
- `WorkOrder` - Maintenance tasks with status and priority
