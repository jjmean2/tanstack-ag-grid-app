import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import type { Plugin, Rolldown } from 'vite'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'

import {
  ASSETS_PATH,
  BACKEND_PATH,
  DEVTOOLS_PAGE,
  FRONTEND_PATH,
  RELAY_MESSAGE,
  SUPERSEDED_CLOSE_CODE,
} from '../src/shared/lib/react-devtools/protocol.ts'
import type { RelayMessage } from '../src/shared/lib/react-devtools/protocol.ts'

const DEVTOOLS_DIR = fileURLToPath(
  new URL('../src/shared/lib/react-devtools/', import.meta.url),
)
const HOOK_SCRIPT = '/src/shared/lib/react-devtools/install-hook.ts'

// The DevTools UI relies on experimental React APIs (e.g. `unstable_getCacheForType`),
// while the app runs on stable React. The dev server shares one `react` across pages,
// so the DevTools page is bundled on its own with `react` aliased to the experimental
// build and served from memory.
async function buildDevtoolsPage(): Promise<Map<string, string>> {
  const output = await build({
    configFile: false,
    root: DEVTOOLS_DIR,
    mode: 'development',
    logLevel: 'warn',
    resolve: {
      alias: [
        { find: /^react-dom(\/.*)?$/, replacement: 'react-dom-experimental$1' },
        { find: /^react(\/.*)?$/, replacement: 'react-experimental$1' },
      ],
    },
    build: {
      write: false,
      minify: false,
      rolldownOptions: {
        input: { 'devtools-page': `${DEVTOOLS_DIR}devtools-page.tsx` },
        output: { entryFileNames: '[name].js', chunkFileNames: '[name].js' },
      },
    },
  })
  const [bundle] = (
    Array.isArray(output) ? output : [output]
  ) as Array<Rolldown.RolldownOutput>
  return new Map(
    bundle.output.flatMap((file) =>
      file.type === 'chunk' ? [[file.fileName, file.code] as const] : [],
    ),
  )
}

// Standalone React DevTools without Electron or the browser extension:
// the app (react-devtools-core backend) and the DevTools page (react-devtools-inline
// frontend) both connect to this dev server, which relays messages between them.
export function reactDevtools(): Plugin {
  return {
    name: 'react-devtools',
    apply: 'serve',

    // Not reachable from Vite's dependency scan (the hook script is injected into
    // HTML). Discovering it at runtime re-optimizes deps and reloads every open page.
    config: () => ({
      optimizeDeps: { include: ['react-devtools-core/backend'] },
    }),

    transformIndexHtml: {
      // Runs after other plugins have injected their tags, so the hook script can be
      // placed ahead of the React Refresh preamble, which installs a stub hook.
      order: 'post',
      handler: (html) =>
        html.replace(
          /<head[^>]*>/,
          (head) =>
            `${head}\n    <script type="module" src="${HOOK_SCRIPT}"></script>`,
        ),
    },

    configureServer(server) {
      let assets: Promise<Map<string, string>> | null = null
      server.watcher.on('change', (file) => {
        if (file.startsWith(DEVTOOLS_DIR)) assets = null
      })

      server.middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url ?? '', 'http://localhost')
        if (pathname === DEVTOOLS_PAGE) {
          readFile(`${DEVTOOLS_DIR}devtools.html`, 'utf-8').then((html) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
          }, next)
          return
        }
        if (!pathname.startsWith(ASSETS_PATH)) return next()

        assets ??= buildDevtoolsPage()
        assets.then(
          (files) => {
            const code = files.get(pathname.slice(ASSETS_PATH.length))
            if (code === undefined) return next()
            res.setHeader('Content-Type', 'text/javascript')
            res.end(code)
          },
          (error: unknown) => {
            assets = null
            next(error)
          },
        )
      })

      const wss = new WebSocketServer({ noServer: true })
      let backend: WebSocket | null = null
      let frontend: WebSocket | null = null

      const notifyFrontend = (status: RelayMessage['status']) => {
        const message: RelayMessage = { type: RELAY_MESSAGE, status }
        frontend?.send(JSON.stringify(message))
      }

      const onFrontend = (ws: WebSocket) => {
        frontend?.close(SUPERSEDED_CLOSE_CODE)
        frontend = ws
        // Make the app reconnect so the new page receives the full tree from scratch.
        backend?.close()
        ws.on('message', (data) => backend?.send(data.toString()))
        ws.on('close', () => {
          if (frontend !== ws) return
          frontend = null
          backend?.close()
        })
      }

      const onBackend = (ws: WebSocket) => {
        // Only one app tab at a time, and only while a DevTools page is listening;
        // a rejected backend retries on its own.
        if (!frontend || backend) {
          ws.close()
          return
        }
        backend = ws
        notifyFrontend('connected')
        ws.on('message', (data) => frontend?.send(data.toString()))
        ws.on('close', () => {
          if (backend !== ws) return
          backend = null
          notifyFrontend('disconnected')
        })
      }

      // Vite's own HMR upgrade handler ignores requests without its subprotocol.
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url ?? '', 'http://localhost')
        if (pathname !== BACKEND_PATH && pathname !== FRONTEND_PATH) return
        wss.handleUpgrade(req, socket, head, (ws) =>
          pathname === BACKEND_PATH ? onBackend(ws) : onFrontend(ws),
        )
      })

      server.httpServer?.once('listening', () => {
        const url = server.resolvedUrls?.local[0]
        if (url) {
          server.config.logger.info(
            `  ➜  React DevTools: ${new URL(DEVTOOLS_PAGE.slice(1), url)}`,
          )
        }
      })
    },
  }
}
