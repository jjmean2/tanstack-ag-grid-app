export type ErrorCode =
  | '#REF!'
  | '#NAME?'
  | '#VALUE!'
  | '#DIV/0!'
  | '#NUM!'
  | '#N/A'
  | '#CYCLE!'
  | '#PARSE!'
  | '#EXT!' // another screen's value is not saved (or is an error there)

// Errors caused by how a formula was written rather than by the data it runs
// on. They are reported when the workbook is built.
export const STRUCTURAL_ERRORS: readonly ErrorCode[] = [
  '#REF!',
  '#NAME?',
  '#CYCLE!',
  '#PARSE!',
]

export class FormulaError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, detail?: string) {
    super(detail ? `${code} ${detail}` : code)
    this.code = code
  }
}
