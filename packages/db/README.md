PlanetScale + Prisma
====================

Environment
- Copy `.env.example` to `.env` and set `DATABASE_URL` from PlanetScale’s “Connect with Prisma” string.

Schema and relation mode
- `prisma/schema.prisma` uses `provider = "mysql"` and `relationMode = "prisma"` (PlanetScale-compatible).

Local development (branch)
- Create a PlanetScale branch (via UI or `pscale` CLI) and connect using the Prisma connect string.
- Push schema to the branch:
  - `pnpm --filter @homegraph/db run db:push`
- Seed demo data:
  - `pnpm --filter @homegraph/db run seed`

Deploy workflow (recommended)
1) Generate a SQL diff (optional):
   pnpm --filter @homegraph/db run migrate:diff

2) Open a deploy request in PlanetScale (UI) or via CLI.
   Review and deploy to production.

3) Point production `DATABASE_URL` at the production branch and restart your app.

Scripts
- `db:push`: `prisma db push` (safe for development branches)
- `migrate:diff`: generates SQL to `prisma/migration.sql` for review
- `seed`: seeds a demo home, rooms, devices, and scenes

Notes
- PlanetScale does not support foreign key constraints; `relationMode = "prisma"` keeps relations in Prisma Client.
- For production changes, prefer PlanetScale deploy requests instead of `prisma migrate dev`.

