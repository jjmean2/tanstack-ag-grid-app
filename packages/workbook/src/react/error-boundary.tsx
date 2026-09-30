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
      <div role="alert" className="wb-error-boundary">
        <strong className="wb-error-boundary-title">
          양식을 표시할 수 없습니다
        </strong>
        <p className="wb-error-boundary-text">
          양식 정의에 오류가 있습니다. 입력한 데이터는 그대로 남아 있습니다.
        </p>
        <code className="wb-error-boundary-detail">{error.message}</code>
        <button
          type="button"
          className="wb-button"
          onClick={() => this.setState({ error: null })}
        >
          다시 시도
        </button>
      </div>
    )
  }
}
