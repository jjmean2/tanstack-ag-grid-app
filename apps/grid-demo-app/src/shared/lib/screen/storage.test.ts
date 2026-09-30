import { buildWorkbook, createStore, screenExports } from '@lab/workbook'
import type { SavedExports } from '@lab/workbook'
import {
  closingWorkbook,
  initialClosing,
} from '#/widgets/closing-workbook/model/closing-workbook'
import { screenStorage } from './storage'

const exports = () =>
  screenExports(
    buildWorkbook(closingWorkbook, initialClosing),
    'closing',
    '결산',
  )

describe('screenStorage', () => {
  beforeEach(() => localStorage.clear())

  it('saves state and exports separately and reads them back', () => {
    const saved = exports()
    expect(screenStorage.save('closing', initialClosing, saved)).toBe(true)
    expect(screenStorage.loadState('closing')).toEqual(initialClosing)
    expect(screenStorage.loadExports(['closing', 'other'])).toEqual({
      closing: saved,
      other: undefined,
    })
  })

  it('ignores data saved in another format version', () => {
    localStorage.setItem(
      'workbook:closing:state',
      JSON.stringify({ version: 0, data: initialClosing }),
    )
    expect(screenStorage.loadState('closing')).toBeUndefined()
  })

  it('updates a store when another browser tab saves a watched screen', () => {
    const store = createStore<SavedExports>({})
    const stop = screenStorage.watchExports(['closing'], store)
    screenStorage.save('closing', initialClosing, exports())
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'workbook:closing:exports' }),
    )
    expect(store.get().closing?.values.netIncome).toBeDefined()
    stop()
  })
})
