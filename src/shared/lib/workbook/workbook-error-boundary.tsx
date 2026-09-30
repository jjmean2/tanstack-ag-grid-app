import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

// Wraps a WorkbookProvider. A definition bug throws while the workbook is built
// (see `checkWorkbook`); this shows it in place of the screen instead of
// unmounting the whole app.
export class WorkbookErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workbook failed to render', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        role="alert"
        className="mx-auto grid max-w-375 gap-3 border border-[#e2b9a4] bg-[#fbf1ea] px-6 py-5 font-sans text-sm text-[#17312d]"
      >
        <strong className="text-base text-[#c0392b]">
          양식을 표시할 수 없습니다
        </strong>
        <p className="text-[#536863]">
          양식 정의에 오류가 있습니다. 입력한 데이터는 그대로 남아 있습니다.
        </p>
        <code className="whitespace-pre-wrap bg-white px-3 py-2 text-xs">
          {error.message}
        </code>
        <button
          type="button"
          className="w-fit cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
          onClick={() => this.setState({ error: null })}
        >
          다시 시도
        </button>
      </div>
    )
  }
}
