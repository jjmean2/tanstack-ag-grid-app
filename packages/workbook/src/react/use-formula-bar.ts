import {
  cellAddress,
  isExternalAddress,
  isGroupAddress,
  isRangeAddress,
  splitExternal,
} from '../core/address'
import { referenceHighlights } from '../core/highlight'
import { navigate } from '../core/navigation'
import type { Address, Cell } from '../core/types'
import { useStore } from './use-store'
import { useWorkbook } from './workbook-context'

// What a formula bar shows, without how: the focused cell, its formula split
// into text and references, and a way to follow each reference. `FormulaBar`
// is one rendering of it; an app can draw its own from the same data.

// A reference in a formula, resolved.
export type FormulaBarRef = {
  address: Address // a cell, a list column, a range, another screen
  kind: 'cell' | 'group' | 'range' | 'external'
  label: string // named from the focused cell ("금액" in the same row, …)
  fullLabel: string // "신고 내용 › (1) 세금계산서 발급분 › 금액"
  // Its number among the formula's references (1..6), shared with the cells
  // it covers so both can be drawn in one colour; none for another screen.
  highlight?: number
  // The referenced value as shown (or its error code); undefined for a list
  // column, a missing cell, or another screen that has not saved it.
  value?: string
  error: boolean
  count?: number // a list column or a range: how many cells
  savedAt?: string // another screen: when it saved the value (ISO)
  missing: boolean // no such cell, or not saved by the other screen
  // Moves focus to the cell (or list) in this workbook, or opens the other
  // screen at the cell the value came from.
  follow: () => void
}

// A piece of a formula as written: plain text, or a reference.
export type FormulaBarPart = { text: string; ref?: FormulaBarRef }

export type FormulaBarState =
  | { cell: undefined }
  | {
      cell: Cell
      label: string
      // Where the value comes from: a formula, a person's value overriding
      // a formula, an input, or a fixed value.
      source: 'formula' | 'override' | 'input' | 'fixed'
      formula?: string // as written, e.g. "=[s1/tax]+[s2/tax]"
      parts: FormulaBarPart[] // empty without a formula
      value: string // shown as formatted, or the error code
      error?: string // the error code
      errorDetail?: string
      overridable: boolean // a formula a person may override by typing
      // While overridden: what the formula gives (formatted, or its error
      // code), and a way back to it.
      computed?: string
      revert?: () => void
    }

export function useFormulaBar(): FormulaBarState {
  const { wb, ui, openScreen } = useWorkbook()
  const focused = useStore(ui, (s) => s.focused)
  const cell = focused
    ? wb.cell(cellAddress(focused.sheetId, focused.rowId, focused.colId))
    : undefined
  if (!cell) return { cell: undefined }
  const highlights = referenceHighlights(wb, focused)

  const resolve = (address: Address): FormulaBarRef => {
    const common = {
      address,
      highlight: highlights.byTarget.get(address),
      label: wb.labelOf(address, cell),
      fullLabel: wb.labelOf(address),
    }
    if (isExternalAddress(address)) {
      const ext = wb.external(address)
      return {
        ...common,
        kind: 'external',
        value: ext?.text,
        error: ext?.error !== undefined,
        savedAt: ext?.savedAt,
        missing: !ext,
        follow: () => openScreen?.(splitExternal(address).screen, ext?.address),
      }
    }
    const follow = () => navigate(ui, wb, address)
    if (isRangeAddress(address) || isGroupAddress(address)) {
      const count = wb.cells(address).length
      return {
        ...common,
        kind: isRangeAddress(address) ? 'range' : 'group',
        count,
        error: false,
        missing: count === 0,
        follow,
      }
    }
    const target = wb.cell(address)
    return {
      ...common,
      kind: 'cell',
      value: target && (target.error ?? target.type.format(target.value)),
      error: target?.error !== undefined,
      missing: !target,
      follow,
    }
  }

  const override = cell.override
  const computed = override?.active ? override.computed : undefined
  return {
    cell,
    label: wb.labelOf(cell.address),
    source: override?.active
      ? 'override'
      : cell.formula
        ? 'formula'
        : cell.write
          ? 'input'
          : 'fixed',
    formula: cell.formula?.text,
    parts: (cell.formula?.parts ?? []).map((p) =>
      p.target ? { text: p.text, ref: resolve(p.target) } : { text: p.text },
    ),
    value: cell.error ?? cell.type.format(cell.value),
    error: cell.error,
    errorDetail: cell.errorDetail,
    overridable: override !== undefined,
    computed: computed && (computed.error ?? cell.type.format(computed.value)),
    revert: override?.active ? override.revert : undefined,
  }
}

// A value this screen reads from another screen, and a way to open it there.
export type ExternalRefItem = {
  address: Address // "ext:closing/netIncome"
  screen: string
  name: string
  label: string // "결산 › 손익계산서 › 당기순이익 › 금액"
  // Missing while that screen has not saved it.
  value?: { text: string; error: boolean; savedAt: string }
  open: () => void // opens the screen at the cell the value came from
}

export function useExternalRefs(): ExternalRefItem[] {
  const { wb, openScreen } = useWorkbook()
  return wb.externalRefs.map((ref) => ({
    address: ref.address,
    screen: ref.screen,
    name: ref.name,
    label: wb.labelOf(ref.address),
    value: ref.value && {
      text: ref.value.text,
      error: ref.value.error !== undefined,
      savedAt: ref.value.savedAt,
    },
    open: () => openScreen?.(ref.screen, ref.value?.address),
  }))
}
