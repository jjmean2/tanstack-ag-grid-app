import { useCallback, useMemo, useState } from 'react'

import { flattenLeafs } from './columns'
import { buildRows } from './layout'
import type { EditTarget, LayoutNode, SheetColumnDef } from './types'

// `columns` and `layout` should be module-level constants so their references
// stay stable across renders.
export function useSheet<T extends { id: string }>(
  initialItems: T[],
  columns: SheetColumnDef<T>[],
  layout: LayoutNode<T>[],
  initialInputs: Record<string, unknown> = {},
) {
  const [items, setItems] = useState(initialItems)
  const [inputs, setInputs] = useState(initialInputs)

  const leafs = useMemo(() => flattenLeafs(columns), [columns])
  const rows = useMemo(
    () => buildRows(layout, { items, inputs, columns: leafs }),
    [layout, items, inputs, leafs],
  )

  const onEdit = useCallback((target: EditTarget, value: unknown) => {
    if (target.scope === 'item') {
      setItems((prev) =>
        prev.map((i) =>
          i.id === target.id ? { ...i, [target.field]: value } : i,
        ),
      )
    } else {
      setInputs((prev) => ({ ...prev, [target.key]: value }))
    }
  }, [])

  return { rows, onEdit }
}
