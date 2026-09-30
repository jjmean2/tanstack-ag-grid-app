import type { Theme } from 'ag-grid-community'
import type { CustomCellRendererProps } from 'ag-grid-react'
import type { ComponentType } from 'react'

import { ActionCell } from './action-cell'
import { gridTexts } from './context-menu'
import type { GridTexts } from './context-menu'
import type { EditorKind } from '../core/cell-types'
import { definePresentation } from '../core/presentation'
import type { BuiltInDisplay, PresentationRule } from '../core/presentation'
import type { Cell, Row } from '../core/types'
import { defaultInputEditors } from '../react/input-editors'
import type { InputEditor } from '../react/input-editors'
import { defaultViews } from '../react/views'
import type { CellViews } from '../react/views'

// An AG Grid editor for an editor id: a provided editor name
// ('agTextCellEditor') or a component, and its params for a cell.
export type GridEditor = {
  component: string | ComponentType<never>
  params?: (cell: Cell) => object
}

export type GridDisplay = ComponentType<CustomCellRendererProps<Row>>

// The built-in ids. AG Grid 36: agDateStringCellEditor edits 'YYYY-MM-DD'
// strings, the format `T.date` stores (DateEditorModule).
export const defaultGridEditors: Record<EditorKind, GridEditor> = {
  text: { component: 'agTextCellEditor' },
  number: { component: 'agNumberCellEditor' },
  select: {
    component: 'agSelectCellEditor',
    params: (cell) => ({ values: [...(cell.type.options ?? [])] }),
  },
  checkbox: { component: 'agCheckboxCellEditor' },
  date: { component: 'agDateStringCellEditor' },
}

export const defaultGridDisplays: Record<
  Exclude<BuiltInDisplay, 'text'>,
  GridDisplay
> = { button: ActionCell }

// The grid's part of `CellViews`.
export type GridViews = {
  theme?: Theme
  editors: Record<string, GridEditor>
  displays: Record<string, GridDisplay>
  texts: GridTexts
}

const defaultGridViews: GridViews = {
  editors: defaultGridEditors,
  displays: defaultGridDisplays,
  texts: gridTexts,
}

export const gridViewsOf = (views: CellViews): GridViews =>
  (views.grid as GridViews | undefined) ?? defaultGridViews

// How an app shows cells in grids and inputs, in one value for
// `WorkbookProvider`'s `views`:
//
//   gridTheme  the AG Grid theme
//   editors    per app editor id, its grid editor and its input component
//              (both required: a cell shows the same way in either view)
//   displays   per app display id, its grid renderer
//   rules      the presentation: which editor, display, alignment and marks
//              each cell gets. Ids must be built in or listed above.
//   texts      words the grid adds (the context menu's "수식으로 되돌리기")
//
// Pass the result as a module-level constant.
export function defineCellViews<
  TEditor extends string = never,
  TDisplay extends string = never,
>(config: {
  gridTheme?: Theme
  editors?: Record<TEditor, { grid: GridEditor; input: InputEditor }>
  displays?: Record<TDisplay, { grid: GridDisplay }>
  rules?: readonly PresentationRule<
    NoInfer<TEditor> | EditorKind,
    NoInfer<TDisplay> | BuiltInDisplay
  >[]
  texts?: Partial<GridTexts>
}): CellViews {
  const editors = Object.entries<{ grid: GridEditor; input: InputEditor }>(
    config.editors ?? {},
  )
  const displays = Object.entries<{ grid: GridDisplay }>(config.displays ?? {})
  const grid: GridViews = {
    theme: config.gridTheme,
    texts: { ...gridTexts, ...config.texts },
    editors: {
      ...defaultGridEditors,
      ...Object.fromEntries(editors.map(([id, e]) => [id, e.grid])),
    },
    displays: {
      ...defaultGridDisplays,
      ...Object.fromEntries(displays.map(([id, d]) => [id, d.grid])),
    },
  }
  return {
    ...defaultViews,
    present: definePresentation(config.rules ?? []),
    input: {
      ...defaultInputEditors,
      ...Object.fromEntries(editors.map(([id, e]) => [id, e.input])),
    },
    grid,
  }
}
