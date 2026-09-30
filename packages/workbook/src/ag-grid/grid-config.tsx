import type { Theme } from 'ag-grid-community'
import type { CustomCellRendererProps } from 'ag-grid-react'
import { createContext, useContext } from 'react'
import type { ComponentType, ReactNode } from 'react'

import { ActionCell } from './action-cell'
import type { Cell, ResolvedRow } from '../core/types'

// An AG Grid editor for an editor id of the presentation: a provided editor
// name ('agTextCellEditor') or a component, and its params for a cell.
export type GridEditor = {
  component: string | ComponentType<never>
  params?: (cell: Cell) => object
}

export type GridDisplay = ComponentType<CustomCellRendererProps<ResolvedRow>>

// The built-in ids. AG Grid 36: agDateStringCellEditor edits 'YYYY-MM-DD'
// strings, the format `T.date` stores (DateEditorModule).
export const defaultGridEditors: Record<string, GridEditor> = {
  text: { component: 'agTextCellEditor' },
  number: { component: 'agNumberCellEditor' },
  select: {
    component: 'agSelectCellEditor',
    params: (cell) => ({ values: [...(cell.type.options ?? [])] }),
  },
  checkbox: { component: 'agCheckboxCellEditor' },
  date: { component: 'agDateStringCellEditor' },
}

export const defaultGridDisplays: Record<string, GridDisplay> = {
  button: ActionCell,
}

// App-wide settings for every SheetGrid below: the theme, and the components
// for editor and display ids (added to, or replacing, the defaults). An id no
// entry knows falls back to the text editor / plain text. Pass module-level
// constants: a new object each render rebuilds the grid's columns.
export type SheetGridConfig = {
  theme?: Theme
  editors?: Record<string, GridEditor>
  displays?: Record<string, GridDisplay>
}

const SheetGridContext = createContext<SheetGridConfig>({})

export function SheetGridProvider({
  children,
  ...config
}: SheetGridConfig & { children: ReactNode }) {
  return <SheetGridContext value={config}>{children}</SheetGridContext>
}

export const useSheetGridConfig = () => useContext(SheetGridContext)
