# Homegraph Monorepo (pnpm)

This is a production‑grade scaffold for a photoreal exterior modeling & control app.

- apps/web — Next.js 14 + Tailwind (dark‑glass), shadcn‑style UI, R3F
- apps/mobile — Capacitor wrappers (iOS/Android) hosting the web UI with native bridges
- packages/engine — 3D/AR engine (three.js + react‑three‑fiber + drei + postprocessing)
- packages/devices — device schema/registry + mock drivers; adapters scaffolded
- packages/shared — types, tokens, a11y, i18n
- packages/mobile-bridge — Capacitor plugin interfaces for RoomPlan and ARCore Depth
- packages/db — Prisma client for PlanetScale

Setup

- Prereqs: Node 18+ (recommended 20), Git, Corepack enabled (`corepack enable`).
- Install deps: `pnpm -w -r install`
- Storybook (optional): `pnpm storybook`

PlanetScale (demo data)

- Copy `.env.example` → `.env` and paste the "Connect with Prisma" string for your PlanetScale DB as `DATABASE_URL`.
- Initialize schema (safe on a dev branch):
  - `pnpm --filter @homegraph/db run db:push`
- Seed demo home/rooms/devices/scenes:
  - `pnpm --filter @homegraph/db run seed`

Run the app

- Web (Next.js): `pnpm -w run dev` then open http://localhost:3000
- E2E (Playwright):
  - `cd apps/web && npx playwright install` (first time)
  - `pnpm test:e2e`

Commands

- `pnpm dev`           # run web (and any other dev tasks)
- `pnpm build`
- `pnpm test`          # unit (vitest)
- `pnpm test:e2e`      # e2e (Playwright)
- `pnpm storybook`

Assets

Place binaries in `assets/` and optionally mirror to `apps/web/public/assets/` for local serving:
- `assets/example.gif`
- `assets/measurements.pdf` (or page images `measurements_Page_XX.png`)
- `assets/mock-scan.glb`

Seed constants are in `docs/metrics.json` (duplicated to `apps/web/public/docs/metrics.json` for the demo).

Keyboard map

- `g`: open Group Manager
- `b`: open Scene Editor (build scenes)
- `i`: open 24h Simulator (inspect)
- `s`: jump to Scenes section
- `o`: jump to Lights section

Performance tiers

- Ultra: best visuals; SMAA, 4K shadows; anisotropy 16; dynamic resolution 1.0
- High: SMAA, 2K shadows; anisotropy 8; dynamic resolution 0.9
- Balanced: FXAA, 1K shadows; anisotropy 4; dynamic resolution 0.8
- Battery: no AA, 512 shadows; anisotropy 1; dynamic resolution 0.6

Scan flow (demo)

- Left rail → Scan → "Continue" → choose "Simulate Scan" (web) or native capture (mobile).
- On step 4, adjust scale/rotation/offset; "Apply Alignment" then "Accept" to save geometry.
- The app persists geometry to DB (`/api/house`).

Scenes demo

- Scenes: Evening, Away, Movie, Clean Up, All Off.
- Hover a scene to preview; Click to apply. Group Manager supports bulk apply to a group.

PWA & offline

- Service worker pre‑caches shell/assets and runtime‑caches API GETs.
- Device state POSTs queue while offline; an Offline badge shows queued count; "Retry now" flushes.
- To test: enable "Offline" in DevTools (Network), toggle a light, return online.

PlanetScale workflow (prod)

- Use PlanetScale branches; prefer deploy requests instead of `migrate dev`.
- Generate diff for review: `pnpm --filter @homegraph/db run migrate:diff` (writes `prisma/migration.sql`).
- Deploy in PlanetScale UI, then point `DATABASE_URL` at production branch.

Troubleshooting

- pnpm not found: `corepack enable && corepack prepare pnpm@9.6.0 --activate`
- Playwright: run `cd apps/web && npx playwright install` once.
- Prisma/PlanetScale: ensure `.env` is set and `relationMode = "prisma"` (already configured).
- Husky hook PATH issues: the hook runs `npx eslint .`; CI enforces full lint/test.
- Service worker cache: force refresh (⌘⇧R) after assets change.

QA gate checklist

- FPS: median ≥ 55fps on "Balanced" for demo scene (Offline badge shows FPS; QualityTier auto‑downgrades).
- Bundle: check "First Load JS" in Next.js build output; target ≤ ~600kB for Balanced.
- PWA offline: open → go offline → interact (write queue visible) → return online (queue flushes).
- A11y: primary surfaces have roles/labels; dialogs are focusable; reduced motion & high contrast respected.
- Scenes: default scenes run (hover preview, click apply); screenshots look correct.

Design note

- See `assets/example.gif` for the intended dark‑glass aesthetic and interactions.
