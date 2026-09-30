import { createRoot } from 'react-dom/client'
import type { Wall } from 'react-devtools-inline/backend'
import {
  createBridge,
  createStore,
  initialize,
} from 'react-devtools-inline/frontend'

import { FRONTEND_PATH, SUPERSEDED_CLOSE_CODE } from './protocol'
import type { RelayMessage } from './protocol'

type Listener = Parameters<Wall['listen']>[0]

const root = createRoot(document.getElementById('devtools')!)
const browserTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light'

let socket: WebSocket
let listeners = new Set<Listener>()
let generation = 0

function renderStatus(text: string) {
  listeners = new Set()
  root.render(<p className="status">{text}</p>)
}

// A fresh bridge/store per backend connection: a reloaded app starts with a new tree.
function mountDevTools() {
  const own = new Set<Listener>()
  listeners = own
  const wall: Wall = {
    listen(fn) {
      own.add(fn)
      return () => own.delete(fn)
    },
    send(event, payload) {
      // Messages from a replaced bridge must not reach the next backend.
      if (listeners === own && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event, payload }))
      }
    },
  }
  const bridge = createBridge(window, wall)
  const store = createStore(bridge)
  const DevTools = initialize(window, { bridge, store })
  root.render(<DevTools key={++generation} browserTheme={browserTheme} />)
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  socket = new WebSocket(`${protocol}://${location.host}${FRONTEND_PATH}`)
  socket.onopen = () => renderStatus('Waiting for the app to connect…')
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data as string) as
      RelayMessage | Parameters<Listener>[0]
    if ('type' in message) {
      if (message.status === 'connected') mountDevTools()
      else renderStatus('App disconnected. Waiting for it to reconnect…')
      return
    }
    listeners.forEach((fn) => fn(message))
  }
  socket.onclose = ({ code }) => {
    if (code === SUPERSEDED_CLOSE_CODE) {
      renderStatus(
        'React DevTools was opened in another tab. Reload to use it here.',
      )
      return
    }
    renderStatus('Dev server disconnected. Retrying…')
    setTimeout(connect, 1000)
  }
}

connect()
