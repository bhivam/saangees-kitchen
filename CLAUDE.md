# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Saangee's Kitchen is a full-stack restaurant ordering application with a React frontend and Express backend. The app supports menu management, cart functionality, order placement, and authentication via phone number OTP.

## Architecture

### Monorepo Structure
- **backend/** - Express server with tRPC API
- **frontend/** - Vite + React SPA with TanStack Router

### Key Technologies
- **Backend**: Express, tRPC, Drizzle ORM (PostgreSQL), Better Auth
- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS 4
- **Package Manager**: pnpm

## Development Commands

### Backend (from `backend/` directory)
```bash
pnpm dev          # Run development server with hot reload
pnpm build        # Compile TypeScript
pnpm db:push      # Push schema changes to database
```

The `dev` command runs three concurrent processes:
1. TypeScript compiler in watch mode
2. Node server with `--watch` flag and env file loading
3. Type generation for frontend router types (outputs to `../frontend/src/router-types`)

### Frontend (from `frontend/` directory)
```bash
pnpm dev          # Start Vite dev server
pnpm build        # Build for production (runs tsc + vite build)
pnpm lint         # Run ESLint
pnpm preview      # Preview production build
```

## Database Architecture

### Core Schema Design

**Menu System** (3-level hierarchy):
- `menu_items` - Base items with name, description, basePrice
- `modifier_groups` - Groups of options (e.g., "Spice Level") with min/max selection constraints
- `modifier_options` - Individual options within groups with priceDelta
- `menu_item_modifier_groups` - Join table linking items to modifier groups with sortOrder

**Daily Menu**:
- `menus_entries` (note the table name) - Daily menu entries linking to menu_items by date with sortOrder

**Orders System**:
- `orders` - Order header with userId, status, total, centsPaid, specialInstructions
- `order_items` - Line items linking to menuEntries (not menuItems directly), with quantity, itemPrice, and optional baggedAt timestamp
- `order_item_modifier_options` - Selected modifiers for each order item with optionPrice snapshot

**Auth System** (Better Auth generated):
- `user` - Core user table with phoneNumber, isAdmin, isAnonymous flags
- `session` - Session management with token-based auth
- `account` - OAuth/credential provider accounts
- `verification` - OTP verification codes

### Schema Patterns
- UUIDs for primary keys (using `uuid().defaultRandom()`)
- Prices stored as integers (cents)
- Drizzle relations defined separately from tables
- Order items snapshot prices at order time (itemPrice, optionPrice) to preserve historical pricing

## Authentication Flow

Uses **Better Auth** with phone number OTP:
1. Anonymous user browsing (optional)
2. Phone number entry → OTP sent to console in development
3. OTP verification → user created/linked
4. Admin detection via `admin-phones.ts` whitelist
5. Session cookie-based auth with credentials: "include"

Admin status determined by phone number match in `backend/src/lib/admin-phones.ts`.

## tRPC API Structure

**Context** (`backend/src/trpc/index.ts`):
- Extracts session from Better Auth
- Determines isAdmin status
- Available on all procedures

**Procedure Types**:
- `publicProcedure` - No auth required, includes timing middleware
- `protectedProcedure` - Requires authenticated user
- `adminProcedure` - Requires admin user

**Routers** (`backend/src/trpc/router/`):
- `menuItems` - CRUD for menu items
- `menu` - Daily menu management
- `modifierGroups` - Modifier group/option management
- `orders` - Order creation and management

**Development Timing**: In dev mode, artificial delay (100-400ms) added to simulate network latency.

## Frontend Architecture

**Router**: TanStack Router with file-based routing in `frontend/src/routes/`
- `__root.tsx` - Root layout with auth guard
- `index.tsx` - Customer menu view
- `dashboard.tsx` - Admin dashboard
- `cart.tsx` - Shopping cart
- `checkout.tsx` - Order checkout flow
- `login.tsx` - Authentication

**State Management**:
- **TanStack Query** for server state (via tRPC)
- **CartContext** for cart state with localStorage persistence (`frontend/src/context/cart-context.tsx`)
- Cart cleanup component ensures stale data removal on mount

**Type Safety**:
- Backend types generated to `frontend/src/router-types/` during backend dev mode
- tRPC provides end-to-end type safety from API to client
- Frontend imports backend AppRouter type for tRPC client setup

## Important Implementation Details

### Cart System
- Cart stored in localStorage with schema versioning
- `MenuItemSelection` type represents cart items with modifier choices
- Cart cleanup runs on app mount to remove expired items
- Cart survives page refresh but cleared on schema changes

### Order Flow
1. User adds items to cart (stored in localStorage)
2. Checkout validates cart against current menu/prices
3. Order created with snapshots of prices at order time
4. Cart cleared after successful order

### Admin Features
- Admin status determined by phone number whitelist
- Admin sees different UI (dashboard vs customer menu)
- Admin procedures protected by `adminProcedure` middleware

### Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port
- `SERVER_URL` - Full server URL (e.g., http://localhost:3000)
- `FRONTEND_URLS` - Semicolon-separated frontend URLs for CORS

**Frontend** (`.env` or Vite environment):
- `VITE_SERVER_URL` - Backend API URL

Both use `@t3-oss/env-core` for runtime validation with Zod.

## Database Migrations

Uses **Drizzle Kit**:
```bash
cd backend
pnpm db:push    # Push schema changes (development)
```

Schema defined in `backend/src/db/schema.ts`. Better Auth tables auto-generated (marked with comments).

## Code Organization Patterns

- Database schema uses Drizzle ORM with explicit relations
- tRPC routers follow resource-based organization
- Frontend components use shadcn/ui conventions (in `components/ui/`)
- Hooks prefixed with `use-` in `hooks/` directory
- Type imports use `@/` alias for frontend (resolves to `src/`)
- Backend uses relative imports

## Testing
No test framework currently configured.

## Linting
In both repositories you can use `eslint .` to do typechecks and enforce linting rules. Make sure to lint before commiting any changes.
