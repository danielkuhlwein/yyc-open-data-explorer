export interface RateWindow {
  days: number[] // 0=Sun .. 6=Sat
  startMin: number
  endMin: number
  kind: 'paid' | 'free' | 'noParking'
  ratePerHour: number // 0 for free/noParking
}

export interface ParsedSchedule {
  windows: RateWindow[]
  notes: string[]
}

const DAY_INDEX: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

function parseDays(text: string): number[] | null {
  const t = text.toLowerCase()
  if (t.includes('weekday')) return [1, 2, 3, 4, 5]
  if (t.includes('sunday/holiday')) return [0]
  const range = t.match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\s*(?:-|to)\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*/)
  if (range) {
    const from = DAY_INDEX[range[1]]
    const to = DAY_INDEX[range[2]]
    const days: number[] = []
    for (let d = from; ; d = (d + 1) % 7) {
      days.push(d)
      if (d === to) break
      if (days.length > 7) return null
    }
    return days
  }
  const single = t.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/)
  return single ? [DAY_INDEX[single[1]]] : null
}

function toMinutes(hour: number, min: number, meridiem: string | undefined): number {
  let h = hour
  if (meridiem) {
    const m = meridiem.toLowerCase()
    if (m === 'pm' && h !== 12) h += 12
    if (m === 'am' && h === 12) h = 0
  }
  return h * 60 + min
}

const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*to\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i

function parseTimeRange(text: string): { startMin: number; endMin: number } | null {
  const m = text.match(TIME_RANGE)
  if (!m) return null
  const startMeridiem = m[3] ?? m[6] // "9:00 to 11:00 AM" style inherits the trailing meridiem
  return {
    startMin: toMinutes(Number(m[1]), Number(m[2] ?? 0), startMeridiem),
    endMin: toMinutes(Number(m[4]), Number(m[5] ?? 0), m[6]),
  }
}

// A bare "digits" or "digits.digits" amount, optionally $-prefixed. Source data
// sometimes drops the leading "$" or the leading "0" before a decimal point
// (e.g. "1.00 per Hour", "$.50 per 30 Min"), and occasionally has 3+ decimal
// digits (e.g. "$1.005 per Hour") — so the fractional part isn't capped at 2.
const AMOUNT = String.raw`\$?(\d*\.\d+|\d+)`

function parseBody(text: string): { kind: RateWindow['kind']; ratePerHour: number } | null {
  const perHour = text.match(new RegExp(`${AMOUNT}\\s*per\\s*hour`, 'i'))
  if (perHour) return { kind: 'paid', ratePerHour: Number(perHour[1]) }

  // "$0.50 per 1/2 hour" / "$1.00 per half hour" -> double to an hourly-equivalent rate
  const perHalfHour = text.match(new RegExp(`${AMOUNT}\\s*per\\s*(?:1/2|half)\\s*hour`, 'i'))
  if (perHalfHour) return { kind: 'paid', ratePerHour: Number(perHalfHour[1]) * 2 }

  // "$1.00 per 30 Min" / "$2.00 each 30 Min" / "$0.50 per 15 Min" -> normalize to an hourly rate
  const perMinutes = text.match(new RegExp(`${AMOUNT}\\s*(?:per|each)\\s*(\\d+)\\s*min`, 'i'))
  if (perMinutes) {
    const amount = Number(perMinutes[1])
    const minutes = Number(perMinutes[2])
    const ratePerHour = minutes > 0 ? (amount * 60) / minutes : amount
    return { kind: 'paid', ratePerHour: Number(ratePerHour.toFixed(2)) }
  }

  if (/no\s+parking/i.test(text)) return { kind: 'noParking', ratePerHour: 0 }
  if (/free/i.test(text)) return { kind: 'free', ratePerHour: 0 }

  // "$1.00" alone — a sibling window's rate that elided the "per Hour" suffix
  const bareAmount = text.match(/^\$(\d*\.\d+|\d+)$/)
  if (bareAmount) return { kind: 'paid', ratePerHour: Number(bareAmount[1]) }

  return null
}

export function parseRateSchedule(html: string | undefined | null): ParsedSchedule {
  const windows: RateWindow[] = []
  const notes: string[] = []
  if (!html) return { windows, notes }

  const blocks = [...html.matchAll(/<b>(.*?)<\/b>([\s\S]*?)(?=<b>|$)/gi)]
  for (const [, rawHeader, rawBody] of blocks) {
    const header = rawHeader.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const body = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // Informational headers ("Free parking to 9 AM") describe boundaries already
    // implied by the windows — keep as notes.
    if (/^free parking/i.test(header)) {
      notes.push(`${header}${body ? ` — ${body}` : ''}`)
      continue
    }

    const days = parseDays(header)
    const time = parseTimeRange(header)
    const rate = parseBody(body)

    if (days && rate) {
      windows.push({
        days,
        startMin: time?.startMin ?? 0,
        endMin: time?.endMin ?? 1440,
        kind: rate.kind,
        ratePerHour: rate.ratePerHour,
      })
      continue
    }

    // Some headers ("Motorcycle Parking Only") carry no day/time themselves —
    // the schedule instead lives in the plain-text body ("Weekdays: 7:00 to 18:00").
    // With no rate info anywhere, the restriction means regular cars can't park.
    const bodyDays = !days ? parseDays(body) : null
    if (bodyDays) {
      const bodyTime = parseTimeRange(body)
      windows.push({
        days: bodyDays,
        startMin: bodyTime?.startMin ?? 0,
        endMin: bodyTime?.endMin ?? 1440,
        kind: 'noParking',
        ratePerHour: 0,
      })
    } else {
      notes.push(`${header}${body ? ` — ${body}` : ''}`)
    }
  }
  return { windows, notes }
}

export function rateAt(schedule: ParsedSchedule, day: number, minutes: number): RateWindow | null {
  return (
    schedule.windows.find(
      (w) => w.days.includes(day) && minutes >= w.startMin && minutes < w.endMin,
    ) ?? null
  )
}

export function sanitizeRateHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?!\/?(?:b|br)\b)[^>]*>/gi, '')
    .replace(/<(\/?)(b|br)\b[^>]*>/gi, '<$1$2>')
}
