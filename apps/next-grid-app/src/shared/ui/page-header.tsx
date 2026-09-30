import Link from 'next/link'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  meta?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
}: PageHeaderProps) {
  return (
    <header className="mx-auto mb-8 flex max-w-[1500px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link
          className="mb-8 inline-flex font-sans text-sm font-bold text-app-muted no-underline"
          href="/"
        >
          ← Workspace
        </Link>
        <p className="mb-3 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-app-warm">
          {eyebrow}
        </p>
        <h1 className="text-5xl font-normal leading-none tracking-[-0.04em] sm:text-7xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[560px] font-sans leading-[1.6] text-app-muted">
          {description}
        </p>
      </div>
      {meta}
    </header>
  )
}
