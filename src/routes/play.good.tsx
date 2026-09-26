import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/play/good')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>HIHI</div>
}
