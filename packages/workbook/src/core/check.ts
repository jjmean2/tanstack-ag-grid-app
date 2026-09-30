import type { Externals, WorkbookDef } from './types'
import { buildWorkbook } from './workbook'

// A layout is a function of the state, so some definition bugs (a duplicate
// row id, a merged cell made editable, a formula pointing at a row that only
// some data produces) show only for certain data. This builds the definition
// against sample states and lists what a definition bug would cause: a thrown
// error or a structural formula error. Meant for each form's tests.
export function checkWorkbook<TState>(
  def: WorkbookDef<TState>,
  samples: Record<string, TState>,
  externals?: Externals,
): string[] {
  const problems: string[] = []
  for (const [name, state] of Object.entries(samples)) {
    try {
      const wb = buildWorkbook(def, state, () => {}, externals)
      for (const e of wb.structuralErrors) {
        problems.push(
          `${name}: ${e.address} ${e.code}${e.detail ? ` (${e.detail})` : ''}`,
        )
      }
    } catch (error) {
      problems.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  return problems
}
