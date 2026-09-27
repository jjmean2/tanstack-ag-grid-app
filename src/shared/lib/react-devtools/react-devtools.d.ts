declare module 'react-devtools-inline/backend' {
  export interface Wall {
    listen: (
      fn: (message: { event: string; payload: unknown }) => void,
    ) => () => void
    send: (
      event: string,
      payload: unknown,
      transferable?: Array<unknown>,
    ) => void
  }
  export type BackendBridge = { readonly __brand: 'BackendBridge' }

  export function initialize(target: Window): void
  export function activate(
    target: Window,
    options?: { bridge?: BackendBridge },
  ): void
  export function createBridge(target: Window, wall?: Wall): BackendBridge
}

declare module 'react-devtools-inline/frontend' {
  import type { ComponentType } from 'react'
  import type { Wall } from 'react-devtools-inline/backend'

  export type FrontendBridge = { readonly __brand: 'FrontendBridge' }
  export type Store = { readonly __brand: 'Store' }

  export interface DevToolsProps {
    browserTheme?: 'light' | 'dark'
    hideSettings?: boolean
    showTabBar?: boolean
    overrideTab?: 'components' | 'profiler'
  }

  export function createBridge(target: Window, wall?: Wall): FrontendBridge
  export function createStore(bridge: FrontendBridge): Store
  export function initialize(
    target: Window,
    options?: { bridge?: FrontendBridge; store?: Store },
  ): ComponentType<DevToolsProps>
}

declare module 'react-devtools-core/backend' {
  export function initialize(settings?: Record<string, unknown>): void
  export function connectToDevTools(options?: {
    host?: string
    port?: number
    path?: string
    useHttps?: boolean
    retryConnectionDelay?: number
    websocket?: WebSocket
    isAppActive?: () => boolean
  }): void
}
