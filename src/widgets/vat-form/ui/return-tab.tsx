import { FormSheet } from '@labs/workbook/react'

// The return: two form sheets stacked, with page text around them (headings
// and notes are plain JSX, not part of the workbook definition).
export function ReturnTab() {
  return (
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
        (10)·(11)란은 「매입 명세」 탭의 목록을 구분별로 합산합니다. 빗금 칸은
        해당 줄에서 쓰지 않는 칸입니다.
      </p>
    </div>
  )
}
