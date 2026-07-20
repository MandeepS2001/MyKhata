# MyKhata

> The truth about your money.

A brutally honest personal finance assistant for Australian users. MyKhata automatically organises your financial life, explains what is happening, and tells you whether you can actually afford something.

## Stack

- **Next.js 15** (App Router, RSC, TypeScript strict)
- **Supabase** (Auth, PostgreSQL, RLS, Storage)
- **Tailwind CSS** + shadcn/ui primitives
- **Zod** + React Hook Form
- **Recharts** (Phase 2+)
- **PWA** ready

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/mandeeps2001/mykhata.git
cd mykhata
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Copy `.env.example` to `.env.local` and fill in your keys

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Try demo mode

Sign up → complete onboarding → choose **Use demo data** to see the full product with realistic Australian financial data.

## Phase 1 (current)

- [x] Project setup & architecture
- [x] Authentication (email/password, forgot password)
- [x] Database schema with RLS
- [x] Onboarding flow
- [x] Demo mode with seed data
- [x] Accounts & transactions
- [x] CSV import (CommBank & Westpac)
- [x] Transaction categorisation
- [x] Transfer detection
- [x] Home dashboard with safe-to-spend hero
- [x] Domain services (testable)
- [x] Bank provider abstraction (future Open Banking)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design, database schema, safe-to-spend engine, and development phases.

## Money handling

All monetary values are stored as **integer cents** in the database. Never use floating-point for money.

```typescript
// $10.50 → 1050 cents
formatCents(1050) // "$10.50"
```

## License

Private — all rights reserved.
