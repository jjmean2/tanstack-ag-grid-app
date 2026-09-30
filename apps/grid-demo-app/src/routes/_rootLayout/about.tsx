import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_rootLayout/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_rootLayout/"!</div>
}
