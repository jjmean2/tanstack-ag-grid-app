# @lab/next-grid-app

The `@lab/workbook` demos on the Next.js App Router: the same workbooks, form
layouts, cell views and themes as `apps/grid-demo-app` (Vite + TanStack
Router), with Next's routing.

```bash
pnpm dev:next        # from the repo root: http://localhost:3002
```

What differs from the Vite app:

- **Routing** — `src/shared/lib/screen/router.ts` opens other screens and reads
  `?cell=` with `next/navigation`; `src/app/*/page.tsx` are the routes.
- **Client-only screens** — a screen starts from what this browser saved
  (localStorage) and draws AG Grid, so pages render it inside `ClientOnly`
  (`src/shared/ui/client-only.tsx`) instead of on the server.
- **Theme before paint** — `src/app/layout.tsx` sets the saved theme on
  `<html>` with an inline script (Next's "Preventing Flash" guide).
- **FSD `pages` layer is `screens`** — `src/pages` would be Next's Pages Router.
- `@lab/workbook` ships TypeScript source; Turbopack compiles workspace packages
  without `transpilePackages`.

## State from a server: TanStack Query

`/server/closing` and `/server/tax` are the closing and tax screens with their
state on a server instead of this browser:

- `src/app/api/screens/[id]` (GET, PUT) and `src/app/api/exports` (GET) are
  Route Handlers over `src/server/screen-store.ts`, an in-memory stand-in for
  a database (seeded with the same data, with a little latency).
- `useServerScreenSession` (`src/shared/lib/server-screen`) loads the state
  with `useSuspenseQuery` (the page shows a fallback meanwhile), feeds other
  screens' exports from a second query into the session, and saves with
  `useMutation`, which invalidates every exports query: the tax screen refetches
  the closing screen's net income.
- It returns the same `ScreenSession` as the browser-storage one: the screen
  frame only calls `session.save()`, so tabs, toolbars and formulas are shared.
