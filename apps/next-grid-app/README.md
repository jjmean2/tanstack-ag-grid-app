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
