import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import type { ColDef, ColGroupDef } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { playgroundGridTheme } from '#/shared/config/ag-grid'
import { currencyFormatter } from '#/shared/lib/formatters'

export const Route = createFileRoute('/grid')({ component: GridDemo })

type Deal = {
  account: string
  owner: string
  region: string
  stage: string
  value: number
  closeDate: string
}

const deals: Deal[] = [
  {
    account: 'Northstar Health',
    owner: 'Mina Park',
    region: 'West',
    stage: 'Negotiation',
    value: 184000,
    closeDate: '2026-10-04',
  },
  {
    account: 'Brightline Foods',
    owner: 'Evan Brooks',
    region: 'East',
    stage: 'Proposal',
    value: 92000,
    closeDate: '2026-10-18',
  },
  {
    account: 'Aster Labs',
    owner: 'Mina Park',
    region: 'West',
    stage: 'Qualified',
    value: 67000,
    closeDate: '2026-11-02',
  },
  {
    account: 'Cedar Works',
    owner: 'Jon Bell',
    region: 'Central',
    stage: 'Closed Won',
    value: 246000,
    closeDate: '2026-09-26',
  },
  {
    account: 'Meridian Studio',
    owner: 'Sora Kim',
    region: 'East',
    stage: 'Discovery',
    value: 41000,
    closeDate: '2026-11-21',
  },
  {
    account: 'Fieldstone Bank',
    owner: 'Jon Bell',
    region: 'Central',
    stage: 'Negotiation',
    value: 128000,
    closeDate: '2026-10-12',
  },
  {
    account: 'Juniper Mobility',
    owner: 'Sora Kim',
    region: 'West',
    stage: 'Proposal',
    value: 156000,
    closeDate: '2026-10-29',
  },
  {
    account: 'Pioneer Energy',
    owner: 'Evan Brooks',
    region: 'East',
    stage: 'Closed Won',
    value: 211000,
    closeDate: '2026-09-19',
  },
]

const columnDefs: (ColDef<Deal> | ColGroupDef<Deal>)[] = [
  {
    field: 'account',
    headerName: 'Account',
    minWidth: 190,
    wrapText: true,
    autoHeight: true,
  },
  {
    headerName: 'Details',
    children: [
      { field: 'owner', headerName: 'Owner', minWidth: 140 },
      { field: 'region', headerName: 'Region', minWidth: 125 },
      { field: 'stage', headerName: 'Stage', minWidth: 150 },
    ],
  },
  {
    field: 'value',
    headerName: 'Pipeline value',
    minWidth: 170,
    type: 'numericColumn',
    valueFormatter: ({ value }) =>
      typeof value === 'number' ? currencyFormatter.format(value) : '',
    aggFunc: 'sum',
  },
  { field: 'closeDate', headerName: 'Close date', minWidth: 145, sort: 'asc' },
]

function GridDemo() {
  const [selectedCount, setSelectedCount] = useState(0)

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-8 text-[#17312d] sm:p-12 lg:p-20">
      <header className="mx-auto mb-10 flex max-w-[1500px] flex-col items-start justify-between gap-8 lg:flex-row">
        <div>
          <Link
            className="mb-11 inline-flex gap-2 font-sans text-sm font-bold text-[#536863] no-underline"
            to="/"
          >
            <span aria-hidden="true">←</span> Workspace
          </Link>
          <p className="mb-4 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#b35131]">
            Enterprise data grid
          </p>
          <h1 className="text-[clamp(3rem,6vw,6rem)] font-normal leading-[0.9] tracking-[-0.04em]">
            Revenue cockpit
          </h1>
          <p className="mt-6 max-w-[480px] font-sans leading-[1.6] text-[#536863]">
            A compact AG Grid Enterprise playground with grouping, filters, and
            live selection.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.05em] text-[#536863]">
          <span className="size-2 rounded-full bg-[#1f6f66]" />
          Q4 pipeline
        </div>
      </header>

      <section
        className="mx-auto mb-5 grid max-w-[1500px] grid-cols-1 border-y border-[#b9c4bb] sm:grid-cols-3"
        aria-label="Pipeline summary"
      >
        <div className="flex flex-col gap-2 border-b border-[#b9c4bb] p-5 font-sans sm:border-b-0 sm:border-r">
          <span className="text-xs uppercase text-[#536863]">
            Total pipeline
          </span>
          <strong className="text-2xl">
            {currencyFormatter.format(1125000)}
          </strong>
        </div>
        <div className="flex flex-col gap-2 border-b border-[#b9c4bb] p-5 font-sans sm:border-b-0 sm:border-r">
          <span className="text-xs uppercase text-[#536863]">
            Open opportunities
          </span>
          <strong className="text-2xl">6</strong>
        </div>
        <div className="flex flex-col gap-2 p-5 font-sans">
          <span className="text-xs uppercase text-[#536863]">
            Selected rows
          </span>
          <strong className="text-2xl">{selectedCount}</strong>
        </div>
      </section>

      <section
        className="mx-auto max-w-375 overflow-hidden border border-[#c5d0c7] bg-[#fffdf8] shadow-[0_1rem_3rem_rgb(38_65_55/8%)]"
        aria-label="Revenue pipeline table"
      >
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[#d8ded8] p-4 font-sans sm:flex-row sm:items-center sm:px-5">
          <div className="flex flex-col gap-1">
            <strong>Pipeline detail</strong>
            <span className="text-[0.82rem] text-[#667b72]">
              Group by account, then explore each opportunity.
            </span>
          </div>
          <span className="inline-flex items-center gap-2 border border-[#b9cfc4] px-2 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[#1f6f66]">
            ENTERPRISE
          </span>
        </div>
        <div className="h-140">
          <AgGridReact<Deal>
            theme={playgroundGridTheme}
            rowData={deals}

            columnDefs={columnDefs}
            defaultColDef={{
              editable: true,
              filter: true,
              flex: 1,
              resizable: true,
              sortable: true,
              floatingFilter: true,
              headerStyle: {
                backgroundColor: '#f5f5f5',
              },
            }}
            autoGroupColumnDef={{
              headerName: 'Account groups',
              minWidth: 230,
            }}
            groupDefaultExpanded={1}
            rowSelection={{ mode: 'multiRow' }}
            onSelectionChanged={(event) =>
              setSelectedCount(event.api.getSelectedRows().length)
            }
            sideBar="columns"
            statusBar={{
              statusPanels: [
                { statusPanel: 'agTotalAndFilteredRowCountComponent' },
                { statusPanel: 'agSelectedRowCountComponent' },
                { statusPanel: 'agAggregationComponent' },
              ],
            }}
          />
        </div>
      </section>
    </main>
  )
}
