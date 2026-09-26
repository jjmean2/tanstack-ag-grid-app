import type { ColDef, GetRowIdParams, RowClassParams } from 'ag-grid-community'
import type { AgGridReactProps } from 'ag-grid-react'
import { useMemo } from 'react'

import { playgroundGridTheme } from '#/shared/config/ag-grid'
import type { Store } from '#/shared/lib/store/create-store'
import { shallowEqual, useStore } from '#/shared/lib/store/use-store'
import { createGridColumns, flattenLeafs } from './columns'
import { buildRows } from './layout'
import type { LayoutNode, SheetColumnDef, SheetRow } from './types'

// A worksheet's layout is positional, so sorting/filtering/moving columns
// would break it (and the column menu would have nothing left to offer).
const defaultColDef: ColDef<SheetRow> = {
  sortable: false,
  filter: false,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  resizable: true,
  headerClass: '[&_.ag-header-cell-label]:justify-center',
}

const getRowId = (p: GetRowIdParams<SheetRow>) => p.data.id
const getRowClass = (p: RowClassParams<SheetRow>) => p.data?.className

// In development, reading a session key that is not listed in `keys` throws
// instead of silently returning undefined (or a stale value).
function guardState<TState extends object>(
  picked: TState,
  full: TState,
): TState {
  if (!import.meta.env.DEV) return picked
  return new Proxy(picked, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && prop in full && !(prop in target)) {
        throw new Error(
          `Sheet layout read session key "${prop}" which is not listed in \`keys\`.`,
        )
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

// Projects a slice of the session store into AG Grid props.
// - `keys`: the session keys the layout reads. The grid re-renders only when
//   one of them changes.
// - `columns` / `layout`: declarations, defined as module-level constants.
export function useSheetGrid<TState extends object, T = never>(
  store: Store<TState>,
  opts: {
    keys: readonly (keyof TState & string)[]
    columns: SheetColumnDef<T>[]
    layout: LayoutNode<TState>[]
  },
): AgGridReactProps<SheetRow> {
  const { keys, columns, layout } = opts

  const picked = useStore(
    store,
    (s) => Object.fromEntries(keys.map((k) => [k, s[k]])) as unknown as TState,
    (a, b) =>
      shallowEqual(a as Record<string, unknown>, b as Record<string, unknown>),
  )
  const leafs = useMemo(() => flattenLeafs(columns), [columns])
  const columnDefs = useMemo(() => createGridColumns(columns), [columns])

  const rows = useMemo(
    () =>
      buildRows(layout, {
        state: guardState(picked, store.get()),
        columns: leafs,
        update: store.set,
      }),
    [picked, layout, leafs, store],
  )

  return useMemo(
    () => ({
      theme: playgroundGridTheme,
      domLayout: 'autoHeight',
      rowData: rows,
      columnDefs,
      defaultColDef,
      getRowId,
      getRowClass,
      stopEditingWhenCellsLoseFocus: true,
    }),
    [rows, columnDefs],
  )
}
