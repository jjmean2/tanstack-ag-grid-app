import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_rootLayout')({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div>
      <Outlet />
    </div>
  )
}
