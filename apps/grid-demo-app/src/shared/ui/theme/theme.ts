// The theme is two attributes on <html>, which themes.css reads: every colour
// on the page (chrome, workbook views, AG Grid) follows them at once.

export const THEMES = {
  forest: '숲',
  slate: '슬레이트',
} as const
export const MODES = { light: '라이트', dark: '다크' } as const

export type ThemeName = keyof typeof THEMES
export type Mode = keyof typeof MODES
export type Theme = { name: ThemeName; mode: Mode }

const KEY = 'app:theme'
const DEFAULT: Theme = { name: 'forest', mode: 'light' }

const isTheme = (t: unknown): t is Theme =>
  typeof t === 'object' &&
  t !== null &&
  (t as Theme).name in THEMES &&
  (t as Theme).mode in MODES

// The theme last chosen in this browser (a per-viewer preference).
export function loadTheme(): Theme {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return isTheme(saved) ? saved : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme.name
  root.dataset.mode = theme.mode
  try {
    localStorage.setItem(KEY, JSON.stringify(theme))
  } catch {
    // Storage unavailable: the theme still applies for this visit.
  }
}
