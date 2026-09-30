'use client'

import { useState } from 'react'

import { applyTheme, loadTheme, MODES, THEMES } from './theme'
import type { Mode, Theme, ThemeName } from './theme'

// Four buttons: each theme, light and dark. Choosing one only sets the
// attributes themes.css reads.
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const choose = (next: Theme) => {
    applyTheme(next)
    setTheme(next)
  }

  const options = (Object.keys(THEMES) as ThemeName[]).flatMap((name) =>
    (Object.keys(MODES) as Mode[]).map((mode) => ({ name, mode })),
  )
  return (
    <div
      role="radiogroup"
      aria-label="테마"
      className="fixed top-4 right-4 z-50 flex gap-1 border border-app-line bg-app-surface p-1 font-sans text-xs shadow-[0_0.5rem_1.5rem_var(--app-shadow)]"
    >
      {options.map((option) => {
        const active = option.name === theme.name && option.mode === theme.mode
        return (
          <button
            key={`${option.name}-${option.mode}`}
            type="button"
            role="radio"
            aria-checked={active}
            className={`cursor-pointer px-2.5 py-1.5 font-bold ${active ? 'bg-app-accent text-app-on-accent' : 'text-app-muted hover:bg-app-hover'}`}
            onClick={() => choose(option)}
          >
            {THEMES[option.name]} · {MODES[option.mode]}
          </button>
        )
      })}
    </div>
  )
}
