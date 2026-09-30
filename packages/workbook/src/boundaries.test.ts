// Keeps the package separable: it imports nothing from the app, and its layers
// depend in one direction only — core ← react ← ag-grid.
//
//   core, layout, store, persistence   no React, no AG Grid
//   react                              React, no AG Grid
//   ag-grid                            React and AG Grid

const sources = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.*'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

const importsOf = (code: string) =>
  [...code.matchAll(/(?:from|import)\s+'([^']+)'/g)].map((m) => m[1])

const layerOf = (path: string) => path.split('/')[1] // './core/x.ts' -> 'core'

const PEERS = ['react', 'ag-grid-community', 'ag-grid-react']
const FRAMEWORK_FREE = ['core', 'layout', 'store', 'persistence', 'index.ts']

describe('package boundaries', () => {
  const files = Object.entries(sources)

  it('reads its own sources', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files)('%s imports only itself and its peers', (_, code) => {
    for (const spec of importsOf(code)) {
      if (spec.startsWith('.')) continue
      expect(PEERS).toContain(spec)
    }
  })

  it.each(files.filter(([path]) => FRAMEWORK_FREE.includes(layerOf(path))))(
    '%s does not depend on React or AG Grid',
    (_, code) => {
      for (const spec of importsOf(code)) {
        expect(spec).not.toMatch(/^(react|ag-grid)|\/(react|ag-grid)(\/|$)/)
      }
    },
  )

  it.each(files.filter(([path]) => layerOf(path) === 'react'))(
    '%s does not depend on AG Grid',
    (_, code) => {
      for (const spec of importsOf(code)) {
        expect(spec).not.toMatch(/^ag-grid|\/ag-grid(\/|$)/)
      }
    },
  )
})
