import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { WorkbookErrorBoundary } from './error-boundary'

describe('WorkbookErrorBoundary', () => {
  it('shows the error in place of the screen and can retry', async () => {
    let broken = true
    function Screen() {
      if (broken) throw new Error('Unknown column "zz"')
      return <p>screen</p>
    }
    function Harness() {
      const [, rerender] = useState(0)
      return (
        <>
          <button type="button" onClick={() => rerender((n) => n + 1)}>
            again
          </button>
          <WorkbookErrorBoundary>
            <Screen />
          </WorkbookErrorBoundary>
        </>
      )
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Harness />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown column "zz"')

    broken = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(screen.getByText('screen')).toBeInTheDocument()
  })
})
