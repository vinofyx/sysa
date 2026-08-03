# @sysa/web — Frontend

Next.js 15 (App Router) frontend for the Sai Yadadri Seva Ashram Platform.

See the [repository root README](../../README.md) for full setup instructions, and [`design/`](../../design/SYSTEM_DESIGN.md) for the UI/UX and architecture this app implements.

## Scripts

| Script                      | Description                               |
| --------------------------- | ----------------------------------------- |
| `npm run dev`               | Start the Next.js dev server on port 3000 |
| `npm run build`             | Production build                          |
| `npm run start`             | Start the production build                |
| `npm run lint` / `lint:fix` | ESLint                                    |
| `npm run typecheck`         | TypeScript check (no emit)                |

## Notable Foundational Pieces

- `src/lib/env.ts` — validated client-side environment variables
- `src/lib/api-client.ts` — shared Axios instance pointed at the backend API
- `src/components/providers/query-provider.tsx` — TanStack Query provider (wired into `src/app/layout.tsx`)
- `src/hooks/use-reduced-motion.ts` — `prefers-reduced-motion` hook, required reading before adding any Framer Motion animation (see `design/09-Animation-Specifications.md`)
- `src/components/ui/` — shadcn/ui components (currently just `button`)

Site pages (Home, About, Donate, Admin dashboard, etc.) are implemented in the next development phase — see [`../../DEVELOPMENT_PROGRESS.md`](../../DEVELOPMENT_PROGRESS.md).
