// Screens of the app: one workbook each. The id names the screen in storage
// keys and in cross-screen references (`[ext:<id>/<name>]`); the path is the
// route that shows it.
export const SCREENS = {
  tax: { title: '법인세 세무조정', path: '/workbook-sheet' },
  closing: { title: '결산', path: '/workbook-closing' },
  vat: { title: '매출·매입 세액 신고서', path: '/workbook-form' },
  adjustment: { title: '소득금액조정', path: '/adjustment-sheet' },
} as const

export type ScreenId = keyof typeof SCREENS

export const isScreenId = (id: string): id is ScreenId => id in SCREENS
