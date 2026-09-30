import type { EditorKind } from '../core/cell-types'
import { defaultPresenter, definePresentation } from '../core/presentation'
import type {
  BuiltInDisplay,
  Presenter,
  PresentationRule,
} from '../core/presentation'
import { defaultInputEditors } from './input-editors'
import type { InputEditor } from './input-editors'

// How an app shows cells, as one value `WorkbookProvider` takes: the
// presentation (rules: which editor, display, alignment, marks per cell) and
// the components behind editor ids in each view. The looks of marks are the
// app's CSS theme.
export type CellViews = {
  present: Presenter
  input: Record<string, InputEditor> // editor id -> component for `CellInput`
  // A grid adapter's part, set by its own `defineCellViews`
  // (@lab/workbook/ag-grid); opaque here.
  grid?: unknown
}

export const defaultViews: CellViews = {
  present: defaultPresenter,
  input: defaultInputEditors,
}

// For apps without a grid: rules and input components. An editor id a rule
// uses must be built in or listed in `editors` (checked by the type).
export function defineInputViews<TEditor extends string = never>(config: {
  editors?: Record<TEditor, InputEditor>
  rules?: readonly PresentationRule<
    NoInfer<TEditor> | EditorKind,
    BuiltInDisplay
  >[]
}): CellViews {
  return {
    present: definePresentation(config.rules ?? []),
    input: { ...defaultInputEditors, ...config.editors },
  }
}
