// Shared between the Vite relay (Node) and the browser pages.
export const BACKEND_PATH = '/__react-devtools/backend'
export const FRONTEND_PATH = '/__react-devtools/frontend'
export const DEVTOOLS_PAGE = '/devtools.html'

// Sent by the relay to the DevTools page; everything else is a bridge message.
export const RELAY_MESSAGE = 'react-devtools-relay'
export type RelayMessage = {
  type: typeof RELAY_MESSAGE
  status: 'connected' | 'disconnected'
}
