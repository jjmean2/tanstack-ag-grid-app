import { useFocusedList, useList } from '@lab/workbook/react'

const LIST = 'purchases/@purchases'

// Adding and removing purchases from outside the grid. What a new purchase is,
// the definition says (`items('purchases', { create })`); these buttons, like
// the grid's add row and its context menu, only choose where.
export function PurchaseToolbar() {
  const list = useList(LIST)
  const focused = useFocusedList()
  // Only rows of this list count (focus may be on another sheet's cell).
  const row = focused?.list.address === LIST ? focused.rowId : undefined
  if (!list) return null

  const button =
    'cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed] disabled:cursor-default disabled:opacity-40'
  return (
    <div className="flex flex-wrap items-center gap-2 font-sans text-sm">
      <button
        type="button"
        className={button}
        disabled={row === undefined || !list.canInsert}
        onClick={() => row && list.insertBelow(row)}
      >
        선택한 행 아래에 추가
      </button>
      <button
        type="button"
        className={button}
        disabled={!list.canInsert}
        onClick={() => list.append()}
      >
        맨 끝에 추가
      </button>
      <button
        type="button"
        className={button}
        disabled={row === undefined || !list.canRemove}
        onClick={() => row && list.remove(row)}
      >
        선택한 행 삭제
      </button>
      <span className="ml-2 text-xs text-[#536863]">
        {list.rowIds.length}건 · 행을 우클릭해도 추가·삭제할 수 있습니다
      </span>
    </div>
  )
}
