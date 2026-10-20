# Rent Manager

A rental management PWA for private landlords in Israel, covering the full tenancy
lifecycle: digital contract signing, move-in protocol, payments and checks tracking,
issues, index linkage, renewal, move-out and deposit return.

Product spec (PRD): https://claude.ai/code/artifact/e786e2a5-a883-40b2-be89-444726cbb6b1

## Stack

- Next.js (App Router) + TypeScript + Tailwind, Hebrew RTL
- Postgres (Supabase, Frankfurt) via Prisma 7
- Supabase Auth & Storage
- Hosting: Vercel (`fra1`)

## Getting started

```bash
npm install
cp .env.example .env   # fill in the Supabase values
npm run db:migrate     # applies migrations + regenerates the Prisma client
npm run dev
```

Open http://localhost:3000.

## Conventions

- After changing `prisma/schema.prisma`, run `npm run db:migrate -- --name <change>`.
  Prisma 7's `migrate dev` no longer regenerates the client by itself; a stale client
  queries columns that no longer exist. Restart `npm run dev` afterwards.
- New tables need RLS enabled in their migration (see `enable_rls`).
- Money is stored in agorot (`Int`).
- Every landlord query is scoped by `ownerId`.
- Tenant pages live under `/l/[token]` and are authorized by a one-time link
  (only a hash of the token is stored).
