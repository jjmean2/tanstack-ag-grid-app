import { Outlet } from '@tanstack/react-router'
import type { ReactElement } from 'react'

interface Props {}

export default function PlayPage(props: Props): ReactElement {
  console.log('props', props)
  return (
    <div>
      PlayPage
      <Outlet />
    </div>
  )
}
