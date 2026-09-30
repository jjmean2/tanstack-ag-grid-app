import { factMarks } from './marks'
import type { Cell } from './types'

// Presentation: what a view does with a cell — which editor, which display,
// which alignment, which extra marks — decided in one place by rules, in terms
// no renderer owns. A grid maps `editor: 'date'` to its date editor, an input
// to `<input type="date">`; the app's theme styles the marks.
//
//   cell facts ──▶ default rules (library) ──▶ app rules, in order ──▶ Presentation
//
// Formatting and parsing stay with the cell type: they must agree with each
// other and with formulas, so a different format is a different type.

export type Align = 'left' | 'right' | 'center'

export type Presentation = {
  // An editor id ('text', 'number', 'select', 'checkbox', 'date', or one the
  // app registers); null: shown read-only.
  editor: string | null
  // How the value shows when not editing: 'text', 'button', or an app id.
  display: string
  align: Align
  // Classes for the theme: the cell's facts (marks.ts), `wb-editable` when an
  // editor is set, `wb-align-<align>` unless left, and what rules add.
  marks: string[]
}

// What rules look at.
export type CellFacts = {
  cell: Cell
  type: string // cell type id
  writable: boolean // the definition gave it a writer
  formula: boolean
  error: boolean
  tags: readonly string[] // its own and its row's
  value: unknown
}

export type PresentationRule = {
  when: (facts: CellFacts) => boolean
  // Fields replace what earlier rules decided; `marks` are added to them.
  then:
    | Partial<Presentation>
    | ((current: Presentation, facts: CellFacts) => Partial<Presentation>)
}

export type Presenter = (cell: Cell) => Presentation

const factsOf = (cell: Cell): CellFacts => ({
  cell,
  type: cell.type.id,
  writable: cell.source.kind === 'value' && cell.source.write !== undefined,
  formula: cell.source.kind === 'formula',
  error: cell.error !== undefined,
  tags: [...cell.rowTags, ...cell.tags],
  value: cell.value,
})

// What every cell gets before any app rule: the type's editor if it can be
// written, a button if it holds an action, the type's alignment.
const defaultsOf = (facts: CellFacts): Presentation => ({
  editor: facts.writable ? facts.cell.type.editor : null,
  display: facts.cell.action ? 'button' : 'text',
  align: facts.cell.type.align,
  marks: [],
})

export function definePresentation(
  rules: readonly PresentationRule[] = [],
): Presenter {
  // A built cell never changes, so its presentation is computed once.
  const cache = new WeakMap<Cell, Presentation>()
  return (cell) => {
    const hit = cache.get(cell)
    if (hit) return hit
    const facts = factsOf(cell)
    let p = defaultsOf(facts)
    for (const rule of rules) {
      if (!rule.when(facts)) continue
      const change =
        typeof rule.then === 'function' ? rule.then(p, facts) : rule.then
      p = { ...p, ...change, marks: [...p.marks, ...(change.marks ?? [])] }
    }
    // A rule may make a cell read-only, never writable: that is the data's
    // decision (whether the definition gave it a writer).
    const editor = facts.writable ? p.editor : null
    const result: Presentation = {
      ...p,
      editor,
      marks: [
        ...factMarks(cell),
        ...(editor === null ? [] : ['wb-editable']),
        ...(p.align === 'left' ? [] : [`wb-align-${p.align}`]),
        ...p.marks,
      ],
    }
    cache.set(cell, result)
    return result
  }
}

// The library's defaults alone.
export const defaultPresenter = definePresentation()
