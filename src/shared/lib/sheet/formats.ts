// Cell format registry. A column declares its default format; an individual
// cell can override it through `Cell.format`.
export const formats = {
  text: {
    format: (v: unknown) => (v == null ? '' : String(v)),
    parse: (v: unknown): unknown => v,
    editor: 'agTextCellEditor',
    align: 'left',
  },
  money: {
    format: (v: unknown) =>
      typeof v === 'number'
        ? v.toLocaleString('ko-KR')
        : v == null
          ? ''
          : String(v),
    parse: (v: unknown): unknown => (v === '' || v == null ? null : Number(v)),
    editor: 'agNumberCellEditor',
    align: 'right',
  },
} as const

export type FormatId = keyof typeof formats
