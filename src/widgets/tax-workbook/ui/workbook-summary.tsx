import { useWorkbook } from '@labs/workbook/react'
import { Stat } from '#/shared/ui/stat'

// Always visible: it reads cells of the workbook by address, so the numbers
// are the same ones the sheets show, defined once as formulas.
export function WorkbookSummary() {
  const { wb } = useWorkbook()
  const gap = wb.value('adj/gap/tax')

  return (
    <>
      <Stat label="과세표준" value={wb.value('calc/base/value')} />
      <Stat
        label="신고서상 금액과의 차이"
        value={gap}
        tone={gap === 0 ? 'ok' : 'error'}
      />
      <Stat label="결정세액" value={wb.value('calc/decided/value')} />
      <Stat label="총부담세액" value={wb.value('calc/burden/value')} />
    </>
  )
}
