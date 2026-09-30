import { toRequest } from '#/entities/tax-session/model/adapter'
import type { TaxSession } from '#/entities/tax-session/model/types'
import type { Store } from '@lab/workbook'
import { useStore } from '@lab/workbook/react'

// Shows the two shapes side by side: the client state and the request payload
// that `toRequest` builds from it.
export function SessionDebug({ store }: { store: Store<TaxSession> }) {
  const state = useStore(store, (s) => s)

  return (
    <details className="mx-auto mt-6 max-w-[1500px] border border-app-line bg-app-surface p-4">
      <summary className="cursor-pointer font-sans text-sm font-bold text-app-muted">
        Session state / request payload
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-sans text-xs font-bold text-app-warm">
            Client state
          </h3>
          <pre className="max-h-96 overflow-auto bg-app-bg p-3 font-mono text-xs">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
        <div>
          <h3 className="mb-2 font-sans text-xs font-bold text-app-warm">
            toRequest(state)
          </h3>
          <pre className="max-h-96 overflow-auto bg-app-bg p-3 font-mono text-xs">
            {JSON.stringify(toRequest(state), null, 2)}
          </pre>
        </div>
      </div>
    </details>
  )
}
