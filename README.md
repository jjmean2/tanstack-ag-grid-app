# TanStack + AG Grid lab

A pnpm monorepo for exploring data-heavy forms with React, TanStack Router and AG Grid.

| Workspace            | Path                                     | What it is                                                                              |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `@lab/root`          | `.`                                      | Workspace settings and shared tooling (ESLint, Prettier, `tsconfig.base.json`)          |
| `@lab/grid-demo-app` | [apps/grid-demo-app](apps/grid-demo-app) | The Vite app: grid demos and the workbook demos                                         |
| `@lab/workbook`      | [packages/workbook](packages/workbook)   | Spreadsheet-like forms over client state; see its [README](packages/workbook/README.md) |

The app depends on the library as `"@lab/workbook": "workspace:*"`.

## Commands

Run from the repository root:

```bash
pnpm install
pnpm dev          # the demo app on http://localhost:3000
pnpm test         # every workspace's tests
pnpm typecheck    # every workspace
pnpm lint         # ESLint over the repository
pnpm format       # Prettier + ESLint --fix
pnpm build        # every workspace that has a build
```

To run a script in one workspace: `pnpm --filter @lab/grid-demo-app <script>`.

With Docker: `docker compose up --watch`.
