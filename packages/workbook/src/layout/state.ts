// Reading and writing a slice of the session state by key, for layout
// helpers. Internal to the layout module.

export type Slice = Record<string, unknown>
export type Item = { id: string } & Slice

// Keys of the session state holding a list of `{ id }` items / a plain object.
export type ListKey<TState> = {
  [K in keyof TState]: TState[K] extends { id: string }[] ? K : never
}[keyof TState] &
  string
export type ObjectKey<TState> = {
  [K in keyof TState]: TState[K] extends readonly unknown[]
    ? never
    : TState[K] extends Slice
      ? K
      : never
}[keyof TState] &
  string

export const read = (state: unknown, key: string) => (state as Slice)[key]
export const listOf = (state: unknown, key: string) =>
  read(state, key) as Item[]
export const patch = <TState extends object>(
  state: TState,
  key: string,
  next: unknown,
): TState => ({ ...state, [key]: next })
