import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const workbookDemos = [
  {
    to: '/adjustment-sheet',
    title: '소득금액조정',
    text: 'The smallest workbook: one sheet, subtotals, an input and a check.',
  },
  {
    to: '/workbook-sheet',
    title: '법인세 세무조정',
    text: 'Tabs over one session, inputs as cells, merged sections, a value from another screen.',
  },
  {
    to: '/workbook-closing',
    title: '결산',
    text: 'A screen that saves and exports values other screens reference.',
  },
  {
    to: '/workbook-form',
    title: '매출·매입 세액 신고서 (예시)',
    text: 'A form sheet laid out like a paper form, fed by a list grid.',
  },
  {
    to: '/large-workbook',
    title: '대용량 원장',
    text: 'Three ledgers of thousands of rows, scrolled with row virtualisation.',
  },
] as const

function Home() {
  return (
    <main className="grid min-h-screen grid-cols-1 content-between gap-12 bg-[radial-gradient(circle_at_85%_15%,var(--app-accent-soft)_0,transparent_27rem),linear-gradient(130deg,var(--app-bg)_0%,var(--app-subtle)_100%)] p-8 text-app-ink sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] lg:items-end lg:p-20">
      <div className="max-w-[720px]">
        <p className="mb-4 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-app-warm">
          TanStack + AG Grid
        </p>
        <h1 className="max-w-[680px] text-[clamp(3.5rem,8vw,7.5rem)] font-normal leading-[0.9] tracking-[-0.04em]">
          Make dense data feel calm.
        </h1>
        <p className="my-8 max-w-[430px] font-sans text-[1.05rem] leading-[1.6] text-app-muted">
          A small workspace for exploring fast, flexible data interfaces with
          React and TanStack Router.
        </p>
        <Link
          className="inline-flex gap-3 border-b-2 border-app-warm pb-2 font-sans font-bold no-underline"
          to="/grid"
        >
          Open the revenue cockpit <span aria-hidden="true">↗</span>
        </Link>
        <Link
          className="ml-6 inline-flex gap-3 border-b-2 border-app-accent pb-2 font-sans font-bold no-underline"
          to="/basic-grid"
        >
          Open the basic grid <span aria-hidden="true">↗</span>
        </Link>

        <nav className="mt-12 grid gap-2 font-sans" aria-label="Workbook demos">
          <p className="text-xs font-bold uppercase tracking-wider text-app-warm">
            Workbook demos
          </p>
          {workbookDemos.map((demo) => (
            <Link
              key={demo.to}
              to={demo.to}
              className="grid gap-0.5 no-underline hover:text-app-accent"
            >
              <strong>{demo.title} ↗</strong>
              <span className="text-sm text-app-muted">{demo.text}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-app-line-strong py-5 font-sans">
        <span className="text-xs font-extrabold text-app-warm">01</span>
        <p className="mb-1 mt-12 text-xs text-app-muted">
          One focused demo page
        </p>
        <strong className="text-xl">Enterprise grid</strong>
      </div>
    </main>
  )
}
