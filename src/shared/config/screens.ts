// Screens whose workbooks reference each other (`[ext:<id>/<name>]`).
export const SCREENS = {
  closing: { title: '결산', path: '/workbook-closing' },
  tax: { title: '법인세 세무조정', path: '/workbook-sheet' },
} as const

export type ScreenId = keyof typeof SCREENS

export const isScreenId = (id: string): id is ScreenId => id in SCREENS
