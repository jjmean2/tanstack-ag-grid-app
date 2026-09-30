// Dates are stored as ISO strings (`YYYY-MM-DD`) and evaluated as day serial
// numbers, like a spreadsheet: serial 1 = 1900-01-01 (valid from 1900-03-01 on),
// so `end - start` is a number of days. All calculations use UTC to stay
// independent of the time zone.

const DAY_MS = 86_400_000
const EPOCH_MS = Date.UTC(1899, 11, 30)
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function partsToSerial(year: number, month: number, day: number) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return Math.round((date.getTime() - EPOCH_MS) / DAY_MS)
}

export function serialToParts(serial: number) {
  const date = new Date(EPOCH_MS + Math.trunc(serial) * DAY_MS)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

// Returns null for anything that is not a real calendar date.
export function isoToSerial(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const match = ISO_DATE.exec(iso)
  if (!match) return null
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  const serial = partsToSerial(year, month, day)
  const back = serialToParts(serial)
  return back.year === year && back.month === month && back.day === day
    ? serial
    : null
}

export function serialToIso(serial: number) {
  const { year, month, day } = serialToParts(serial)
  const pad = (n: number, width: number) => String(n).padStart(width, '0')
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

const lastDayOf = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

// EDATE: same day in another month, clamped to that month's last day.
export function addMonths(serial: number, months: number) {
  const { year, month, day } = serialToParts(serial)
  const total = year * 12 + (month - 1) + Math.trunc(months)
  const newYear = Math.floor(total / 12)
  const newMonth = (((total % 12) + 12) % 12) + 1
  return partsToSerial(
    newYear,
    newMonth,
    Math.min(day, lastDayOf(newYear, newMonth)),
  )
}

// EOMONTH: last day of the month `months` away.
export function endOfMonth(serial: number, months: number) {
  const { year, month } = serialToParts(addMonths(serial, months))
  return partsToSerial(year, month, lastDayOf(year, month))
}

// Number of complete months between two dates (DATEDIF "M").
export function completeMonths(start: number, end: number) {
  const a = serialToParts(start)
  const b = serialToParts(end)
  const months = (b.year - a.year) * 12 + (b.month - a.month)
  return b.day < a.day ? months - 1 : months
}
