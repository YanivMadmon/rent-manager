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
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

## Conventions

- Money is stored in agorot (`Int`).
- Every landlord query is scoped by `ownerId`.
- Tenant pages live under `/l/[token]` and are authorized by a one-time link
  (only a hash of the token is stored).
