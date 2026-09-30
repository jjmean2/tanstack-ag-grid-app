import type { Externals, ScreenExports, Workbook } from './types'

// Snapshot of what a screen publishes, taken when it is saved.
export function screenExports(
  wb: Workbook,
  screen: string,
  title: string,
): ScreenExports {
  return {
    screen,
    title,
    savedAt: new Date().toISOString(),
    values: wb.exports,
  }
}

// Serves the saved exports of other screens to `buildWorkbook`.
export function externalsFrom(
  saved: Record<string, ScreenExports | undefined>,
): Externals {
  return (screen, name) => {
    const snapshot = saved[screen]
    const value = snapshot?.values[name]
    if (!snapshot || !value) return undefined
    return {
      ...value,
      screen,
      screenTitle: snapshot.title,
      savedAt: snapshot.savedAt,
    }
  }
}
