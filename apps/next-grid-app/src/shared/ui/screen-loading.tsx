// What a server-backed screen shows while its state is loading.
export function ScreenLoading({ what }: { what: string }) {
  return (
    <div
      role="status"
      className="mx-auto grid max-w-375 place-items-center border border-app-line bg-app-surface px-6 py-24 font-sans text-sm text-app-muted"
    >
      {what}을(를) 서버에서 불러오는 중…
    </div>
  )
}
