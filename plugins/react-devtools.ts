import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import type { Plugin } from 'vite'

import {
  BACKEND_PATH,
  DEVTOOLS_PAGE,
  FRONTEND_PATH,
  RELAY_MESSAGE,
} from '../src/shared/lib/react-devtools/protocol.ts'
import type { RelayMessage } from '../src/shared/lib/react-devtools/protocol.ts'

const HOOK_SCRIPT = '/src/shared/lib/react-devtools/install-hook.ts'

// Standalone React DevTools without Electron or the browser extension:
// the app (react-devtools-core backend) and the DevTools page (react-devtools-inline
// frontend) both connect to this dev server, which relays messages between them.
export function reactDevtools(): Plugin {
  return {
    name: 'react-devtools',
    apply: 'serve',

    transformIndexHtml: {
      // Runs after other plugins have injected their tags, so the hook script can be
      // placed ahead of the React Refresh preamble, which installs a stub hook.
      order: 'post',
      handler: (html, ctx) =>
        ctx.path === DEVTOOLS_PAGE
          ? html
          : html.replace(
              /<head[^>]*>/,
              (head) =>
                `${head}\n    <script type="module" src="${HOOK_SCRIPT}"></script>`,
            ),
    },

    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true })
      let backend: WebSocket | null = null
      let frontend: WebSocket | null = null

      const notifyFrontend = (status: RelayMessage['status']) => {
        const message: RelayMessage = { type: RELAY_MESSAGE, status }
        frontend?.send(JSON.stringify(message))
      }

      const onFrontend = (ws: WebSocket) => {
        frontend?.close()
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
