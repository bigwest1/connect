# Homegraph Monorepo (pnpm)

This is a production‑grade scaffold for a photoreal exterior modeling & control app.

- apps/web — Next.js 14 + Tailwind (dark‑glass), shadcn‑style UI, R3F
- apps/mobile — Capacitor wrappers (iOS/Android) hosting the web UI with native bridges
- packages/engine — 3D/AR engine (three.js + react‑three‑fiber + drei + postprocessing)
- packages/devices — device schema/registry + mock drivers; adapters scaffolded
- packages/shared — types, tokens, a11y, i18n
- packages/mobile-bridge — Capacitor plugin interfaces for RoomPlan and ARCore Depth
- packages/db — Prisma client for PlanetScale

Commands

- `pnpm i`
- `pnpm dev`           # run web (and any other dev tasks)
- `pnpm build`
- `pnpm test`          # vitest
- `pnpm test:e2e`      # playwright (web)
- `pnpm storybook`

Assets

Place binaries in `assets/` and optionally mirror to `apps/web/public/assets/` for local serving:
- `assets/example.gif`
- `assets/measurements.pdf` (or page images `measurements_Page_XX.png`)
- `assets/mock-scan.glb`

Seed constants are in `docs/metrics.json` (duplicated to `apps/web/public/docs/metrics.json` for the demo).

PlanetScale

Set `DATABASE_URL` and run `pnpm --filter @homegraph/db generate`. For schema changes on PlanetScale, use branch workflow and `pnpm --filter @homegraph/db migrate:deploy`.

