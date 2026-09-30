// Shared between the Vite relay (Node) and the browser pages.
export const BACKEND_PATH = '/__react-devtools/backend'
export const FRONTEND_PATH = '/__react-devtools/frontend'
export const DEVTOOLS_PAGE = '/devtools.html'
// Prefix for the separately bundled DevTools page scripts.
export const ASSETS_PATH = '/__react-devtools/'

// Sent by the relay to the DevTools page; everything else is a bridge message.
export const RELAY_MESSAGE = 'react-devtools-relay'
export type RelayMessage = {
  type: typeof RELAY_MESSAGE
  status: 'connected' | 'disconnected'
}

// Close code the relay uses when a newer DevTools page takes over; the old page must
// not reconnect, or the two pages would keep replacing each other.
export const SUPERSEDED_CLOSE_CODE = 4000
