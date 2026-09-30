import Link from 'next/link'

import { SCREENS } from '@/shared/config/screens'

const demos = [
  {
    screen: 'adjustment',
    text: 'The smallest workbook: one sheet, subtotals, an input and a check.',
  },
  {
    screen: 'tax',
    text: 'Tabs over one session, inputs as cells, merged sections, a value from another screen.',
  },
  {
    screen: 'closing',
    text: 'A screen that saves and exports values other screens reference.',
  },
  {
    screen: 'vat',
    text: 'A form sheet laid out like a paper form, fed by a list grid.',
  },
  {
    screen: 'large',
    text: 'Three ledgers of thousands of rows, scrolled with row virtualisation.',
  },
] as const

export default function Home() {
  return (
    <main className="grid min-h-screen content-end bg-[radial-gradient(circle_at_85%_15%,var(--app-accent-soft)_0,transparent_27rem),linear-gradient(130deg,var(--app-bg)_0%,var(--app-subtle)_100%)] p-8 text-app-ink sm:p-12 lg:p-20">
      <div className="max-w-[720px]">
        <p className="mb-4 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-app-warm">
          Next.js + AG Grid
        </p>
        <h1 className="max-w-[680px] text-[clamp(3.5rem,8vw,7.5rem)] font-normal leading-[0.9] tracking-[-0.04em]">
          Make dense data feel calm.
        </h1>
        <p className="my-8 max-w-[480px] font-sans text-[1.05rem] leading-[1.6] text-app-muted">
          The @lab/workbook demos on the Next.js App Router: the same workbooks,
          views and themes as the Vite app, with Next&apos;s routing.
        </p>
        <nav className="mt-12 grid gap-2 font-sans" aria-label="Workbook demos">
          <p className="text-xs font-bold uppercase tracking-wider text-app-warm">
            Workbook demos
          </p>
          {demos.map((demo) => (
            <Link
              key={demo.screen}
              href={SCREENS[demo.screen].path}
              className="grid gap-0.5 no-underline hover:text-app-accent"
            >
              <strong>{SCREENS[demo.screen].title} ↗</strong>
              <span className="text-sm text-app-muted">{demo.text}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
