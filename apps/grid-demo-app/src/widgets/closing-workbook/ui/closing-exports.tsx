import { useWorkbook } from '@lab/workbook/react'
import { SCREENS } from '#/shared/config/screens'

// What this screen publishes for others (saved with it), and a way to the
// screen that reads it.
export function ClosingExports() {
  const { wb, openScreen } = useWorkbook()
  return (
    <>
      <div className="grid gap-1">
        <span className="text-xs font-bold text-[#536863]">
          다른 화면에 공개하는 값 (저장할 때 함께 저장)
        </span>
        <ul className="flex flex-wrap gap-x-6" data-exports>
          {Object.entries(wb.exports).map(([name, value]) => (
            <li key={name}>
              <code className="text-xs text-[#b35131]">ext:closing/{name}</code>{' '}
              {value.label} ={' '}
              <strong className="font-mono">{value.text}</strong>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
        onClick={() => openScreen?.('tax')}
      >
        {SCREENS.tax.title} 화면 열기 ↗
      </button>
    </>
  )
}
