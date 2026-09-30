import type { Theme } from 'ag-grid-community'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

// App-wide settings for every SheetGrid below: the look is the app's choice,
// not the library's. Without a provider AG Grid's default theme is used.
export type SheetGridConfig = { theme?: Theme }

const SheetGridContext = createContext<SheetGridConfig>({})

export function SheetGridProvider({
  children,
  ...config
}: SheetGridConfig & { children: ReactNode }) {
  return <SheetGridContext value={config}>{children}</SheetGridContext>
}

export const useSheetGridConfig = () => useContext(SheetGridContext)
