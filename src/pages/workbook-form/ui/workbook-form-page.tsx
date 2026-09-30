import { useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'

import { createStore } from '#/shared/lib/store/create-store'
import type { Store } from '#/shared/lib/store/create-store'
import { useStore } from '#/shared/lib/store/use-store'
import { FormSheet } from '#/shared/lib/workbook/form-sheet'
import { FormulaBar } from '#/shared/lib/workbook/formula-bar'
import { createUiStore } from '#/shared/lib/workbook/navigation'
import type { UiState } from '#/shared/lib/workbook/navigation'
import { SheetGrid } from '#/shared/lib/workbook/sheet-grid'
import {
  useFocusAddress,
  useWorkbook,
  WorkbookProvider,
} from '#/shared/lib/workbook/workbook-context'
import { WorkbookErrorBoundary } from '#/shared/lib/workbook/workbook-error-boundary'
import { PageHeader } from '#/shared/ui/page-header'
import { initialVat, vatWorkbook } from '#/widgets/vat-form/model/vat-form'

const tabs = [
  { id: 'return', label: '신고서' },
  { id: 'purchases', label: '매입 명세' },
] as const

function Screen({ ui, focusCell }: { ui: Store<UiState>; focusCell?: string }) {
  const { wb } = useWorkbook()
  const tab = useStore(ui, (s) => s.tab)
  const errors = wb.errors.length

  const navigate = useNavigate()
  const clearCell = useCallback(
    () => void navigate({ to: '/workbook-form', search: {}, replace: true }),
    [navigate],
  )
  useFocusAddress(focusCell, clearCell)

  return (
    <>
      <FormulaBar />
      <section className="mx-auto max-w-375 border border-[#c5d0c7] bg-[#fffdf8] shadow-[0_1rem_3rem_rgb(38_65_55/8%)]">
        <nav
          className="flex border-b border-[#c5d0c7] font-sans"
          role="tablist"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`cursor-pointer border-r border-[#c5d0c7] px-5 py-3 text-sm font-bold ${tab === t.id ? 'bg-[#fffdf8] text-[#17312d]' : 'bg-[#eef3ed] text-[#536863]'}`}
              onClick={() => ui.set((s) => ({ ...s, tab: t.id }))}
            >
              {t.label}
            </button>
          ))}
          {errors > 0 && (
            <span className="ml-auto self-center px-4 font-sans text-xs font-bold text-[#c0392b]">
              수식 오류 {errors}
            </span>
          )}
        </nav>

        {/* Inactive tabs are unmounted; the data lives in the store. */}
        {tab === 'return' && (
          <div className="grid gap-6 p-6">
            <header className="grid gap-1 text-center">
              <h2 className="font-sans text-xl font-bold tracking-wider">
                매출·매입 세액 신고서 (예시)
              </h2>
              <p className="font-sans text-xs text-[#536863]">
                종이 서식의 레이아웃만 참고한 가상 서식입니다. 실제 법정서식이
                아닙니다.
              </p>
            </header>
            <FormSheet sheetId="info" />
            <FormSheet sheetId="ret" />
            <p className="font-sans text-xs text-[#536863]">
              (10)·(11)란은 「매입 명세」 탭의 목록을 구분별로 합산합니다. 빗금
              칸은 해당 줄에서 쓰지 않는 칸입니다.
            </p>
          </div>
        )}
        {tab === 'purchases' && (
          <div className="p-6">
            <div className="border border-[#c5d0c7]">
              <SheetGrid sheetId="purchases" />
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export function WorkbookFormPage({ focusCell }: { focusCell?: string }) {
  const [session] = useState(() => ({
    store: createStore(initialVat),
    ui: createUiStore('return'),
  }))

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 서식형 sheet"
        title="Form sheet"
        description="Boxes placed on a grid like a paper form, with merges in any direction. Its boxes are workbook cells: select one to see its formula, and follow a reference into the purchase list grid."
      />
      <WorkbookErrorBoundary>
        <WorkbookProvider
          store={session.store}
          def={vatWorkbook}
          ui={session.ui}
        >
          <Screen ui={session.ui} focusCell={focusCell} />
        </WorkbookProvider>
      </WorkbookErrorBoundary>
    </main>
  )
}
