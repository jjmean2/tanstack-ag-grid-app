// Injected by the `reactDevtools` Vite plugin ahead of the React Refresh preamble.
// The hook must exist before react-dom loads; if the refresh runtime (or the browser
// extension) installs its own hook first, `initialize` becomes a no-op.
import { connectToDevTools, initialize } from 'react-devtools-core/backend'

import { BACKEND_PATH } from './protocol'

initialize()

// Connects through the Vite dev server, which relays to the DevTools page.
// The relay closes this socket while no DevTools page is open, so it keeps retrying.
connectToDevTools({
  host: location.hostname,
  port: Number(location.port) || (location.protocol === 'https:' ? 443 : 80),
  path: BACKEND_PATH,
  useHttps: location.protocol === 'https:',
  retryConnectionDelay: 1000,
})
