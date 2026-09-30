import type { ScreenExports, Workbook } from './types'

// Snapshot of what a screen publishes, taken when it is saved. Other screens
// read it (`buildWorkbook`'s `externals`) without loading this one.
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
