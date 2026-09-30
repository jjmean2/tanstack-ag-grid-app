import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { ClientOnly } from '@/shared/ui/client-only'
import { ThemeSwitcher } from '@/shared/ui/theme/theme-switcher'

export const metadata: Metadata = {
  title: 'Workbook · Next.js',
  description: '@lab/workbook demos on the Next.js App Router',
}

// Sets the theme saved in this browser on <html> before the first paint (the
// server renders the default one), as Next's "Preventing Flash" guide does.
// Same key and shape as theme.ts.
const applySavedTheme = `(function(){try{var t=JSON.parse(localStorage.getItem('app:theme')||'null');if(t&&['forest','slate'].indexOf(t.name)>=0&&['light','dark'].indexOf(t.mode)>=0){var r=document.documentElement;r.dataset.theme=t.name;r.dataset.mode=t.mode}}catch(e){}})()`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      data-theme="forest"
      data-mode="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySavedTheme }} />
      </head>
      <body>
        <ClientOnly>
          <ThemeSwitcher />
        </ClientOnly>
        {children}
      </body>
    </html>
  )
}
