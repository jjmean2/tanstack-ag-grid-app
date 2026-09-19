import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="grid min-h-screen grid-cols-1 content-between gap-12 bg-[radial-gradient(circle_at_85%_15%,#d5e7d9_0,transparent_27rem),linear-gradient(130deg,#f4f1e9_0%,#ebe7dc_100%)] p-8 text-[#17312d] sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(220px,300px)] lg:items-end lg:p-20">
      <div className="max-w-[720px]">
        <p className="mb-4 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#b35131]">
          TanStack + AG Grid
        </p>
        <h1 className="max-w-[680px] text-[clamp(3.5rem,8vw,7.5rem)] font-normal leading-[0.9] tracking-[-0.04em]">
          Make dense data feel calm.
        </h1>
        <p className="my-8 max-w-[430px] font-sans text-[1.05rem] leading-[1.6] text-[#536863]">
          A small workspace for exploring fast, flexible data interfaces with
          React and TanStack Router.
        </p>
        <Link
          className="inline-flex gap-3 border-b-2 border-[#b35131] pb-2 font-sans font-bold no-underline"
          to="/grid"
        >
          Open the revenue cockpit <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="border-t border-[#9aaba0] py-5 font-sans">
        <span className="text-xs font-extrabold text-[#b35131]">01</span>
        <p className="mb-1 mt-12 text-xs text-[#536863]">
          One focused demo page
        </p>
        <strong className="text-xl">Enterprise grid</strong>
      </div>
    </main>
  )
}
