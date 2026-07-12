import { describe, it, expect } from 'vitest'
import { parseRateSchedule, rateAt, sanitizeRateHtml } from './rateSchedule'

const STANDARD =
  '<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>$4.00 per Hour<br><br><b>Mon-Fri 11:00 AM to 1:30 PM</b><br><br>$4.25 per Hour<br><br><b>Mon-Fri 1:30 PM to 3:30 PM</b><br><br>$3.25 per Hour<br><br><b>Mon-Fri 3:30 PM to 6:00 PM</b><br><br>$2.25 per Hour<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$1.00 per Hour<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const SPLIT_DAYS =
  '<b>Mon-Thu 11:00 AM to 1:30 PM</b><br><br>$1.75 per Hour<br><br><b>Fri 11:00 AM to 1:00 PM</b><br><br>$1.75 per Hour<br><br>'

const TWENTY_FOUR_HOUR = '<b>Saturday: 09:00 to 18:00</b><br><br>$2.00 per Hour<br><br>'

const NO_PARKING_BLOCK =
  '<b>Mon-Fri 7:00 AM to 9:00 AM</b><br><br>No Parking at this time<br><br>'

const LOADING_ZONE = '<b>Loading zone:</b><br><br>Free 5 mins<br><br>'

// Real fixtures below were found via the live-dataset fuzz pass (Step 5) — each
// exercises a body/header phrasing the initial implementation didn't recognize.

const PER_HALF_HOUR =
  '<b>Weekdays: 09:00 to 18:00</b><br><br>$0.50 per 1/2 hour, max:$6.00<br><br><b>Saturday: 09:00 to 18:00</b><br><br>$0.50 per 1/2 hour, max:$2.25<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9am</b><br><br>See Signs /Parking Restrictions<br><br>'

const PER_30_MIN =
  '<b>Mon-Fri 8:30 AM to 3:30 PM</b><br><br>$2.00 each 30 Min Max@:@ 30 Min<br><br><b>No Parking at this time</b><br><br>See Street Signs<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$.50 per 30 Min<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 7 AM Mon-Fri</b><br><br>See Signs /Parking Restrictions<br><br>'

const PER_15_MIN =
  '<b>Mon-Fri 9:00 AM to 6:00 PM</b><br><br>$1.00 Each 15 Min<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$0.50 per 15 Min<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const MISSING_DOLLAR_SIGN =
  '<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>Free till 11am<br><br><b>Mon-Fri 11:00 AM to 1:30 PM</b><br><br>$1.00 per Hour<br><br><b>Mon-Fri 1:30 PM to 3:30 PM</b><br><br>1.00 per Hour<br><br><b>Mon-Fri 3:30 PM to 6:00 PM</b><br><br>1.00 per Hour<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$1.00 per Hour<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 7 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const BARE_AMOUNT =
  '<b>Mon-Fri 9:00 AM to 1:30 PM</b><br><br>$1.00 per Hour<br><br><b>Mon-Fri 1:30 PM to 3:30 PM</b><br><br>$1.00 per Hour<br><br><b>Mon-Fri 3:30 PM to 6:00 PM</b><br><br>$1.00 per Hour<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$1.00<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const THREE_DECIMAL_RATE =
  '<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>$1.005 per Hour<br><br><b>Mon-Fri 11:00 AM to 1:30 PM</b><br><br>$1.50 per Hour<br><br><b>Mon-Fri 1:30 PM to 3:30 PM</b><br><br>$1.00 per Hour<br><br><b>Mon-Fri 3:30 PM to 6:00 PM</b><br><br>$1.00 per Hour<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>Free 2 Hour, max:3 Hours<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const MOTORCYCLE_ONLY =
  '<b>Motorcycle Parking Only</b><br><br>Weekdays: 7:00 to 18:00<br><br><b>Motorcycle Parking Only</b><br><br>Saturday: 7:00 to 18:00<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 7am</b><br><br>See Signs /Parking Restrictions<br><br>'

describe('parseRateSchedule', () => {
  it('parses the standard multi-window schedule', () => {
    const s = parseRateSchedule(STANDARD)
    // 4 paid Mon-Fri windows + Saturday paid + Sunday free = 6 windows
    expect(s.windows).toHaveLength(6)
    expect(s.windows[0]).toEqual({
      days: [1, 2, 3, 4, 5],
      startMin: 540,
      endMin: 660,
      kind: 'paid',
      ratePerHour: 4,
    })
    const sunday = s.windows.find((w) => w.days.length === 1 && w.days[0] === 0)!
    expect(sunday.kind).toBe('free')
    expect(sunday.startMin).toBe(0)
    expect(sunday.endMin).toBe(1440)
    // "Free parking to 9 AM" header carries no day/time window -> note
    expect(s.notes.some((n) => n.includes('Free parking to 9 AM'))).toBe(true)
  })

  it('handles split day ranges (Mon-Thu vs Fri)', () => {
    const s = parseRateSchedule(SPLIT_DAYS)
    expect(s.windows[0].days).toEqual([1, 2, 3, 4])
    expect(s.windows[1].days).toEqual([5])
    expect(s.windows[1].endMin).toBe(13 * 60)
  })

  it('parses 24-hour times', () => {
    const s = parseRateSchedule(TWENTY_FOUR_HOUR)
    expect(s.windows[0]).toMatchObject({ days: [6], startMin: 540, endMin: 1080, ratePerHour: 2 })
  })

  it('parses no-parking windows', () => {
    const s = parseRateSchedule(NO_PARKING_BLOCK)
    expect(s.windows[0]).toMatchObject({ kind: 'noParking', startMin: 420, endMin: 540 })
  })

  it('returns zero windows plus a note for non-schedule zones', () => {
    const s = parseRateSchedule(LOADING_ZONE)
    expect(s.windows).toHaveLength(0)
    expect(s.notes.length).toBeGreaterThan(0)
  })

  it('handles empty/undefined input', () => {
    expect(parseRateSchedule('').windows).toHaveLength(0)
  })
})

describe('parseRateSchedule — real-data edge cases from fuzz verification', () => {
  it('normalizes "per 1/2 hour" billing to an hourly-equivalent rate', () => {
    const s = parseRateSchedule(PER_HALF_HOUR)
    expect(s.windows).toHaveLength(3)
    expect(s.windows[0]).toMatchObject({ days: [1, 2, 3, 4, 5], kind: 'paid', ratePerHour: 1 })
    expect(s.windows[1]).toMatchObject({ days: [6], kind: 'paid', ratePerHour: 1 })
  })

  it('normalizes "per 30 Min" / "each 30 Min" billing, including a leading-zero-less "$.50"', () => {
    const s = parseRateSchedule(PER_30_MIN)
    // Mon-Fri paid + Saturday paid + Sunday free = 3; the standalone "No Parking
    // at this time" header carries no day/time and stays a note.
    expect(s.windows).toHaveLength(3)
    expect(s.windows[0]).toMatchObject({ days: [1, 2, 3, 4, 5], kind: 'paid', ratePerHour: 4 })
    expect(s.windows[1]).toMatchObject({ days: [6], kind: 'paid', ratePerHour: 1 })
    expect(s.notes.some((n) => n.includes('No Parking at this time'))).toBe(true)
  })

  it('normalizes "per 15 Min" / "Each 15 Min" billing', () => {
    const s = parseRateSchedule(PER_15_MIN)
    expect(s.windows[0]).toMatchObject({ days: [1, 2, 3, 4, 5], kind: 'paid', ratePerHour: 4 })
    expect(s.windows[1]).toMatchObject({ days: [6], kind: 'paid', ratePerHour: 2 })
  })

  it('parses a paid rate even when the source data drops the leading "$"', () => {
    const s = parseRateSchedule(MISSING_DOLLAR_SIGN)
    expect(s.windows).toHaveLength(6)
    expect(s.windows[0]).toMatchObject({ kind: 'free' }) // "Free till 11am"
    expect(s.windows[2]).toMatchObject({
      days: [1, 2, 3, 4, 5],
      startMin: 810,
      endMin: 930,
      kind: 'paid',
      ratePerHour: 1,
    })
  })

  it('treats a bare "$1.00" body (no "per Hour" suffix) as a paid hourly rate', () => {
    const s = parseRateSchedule(BARE_AMOUNT)
    const saturday = s.windows.find((w) => w.days.length === 1 && w.days[0] === 6)!
    expect(saturday).toMatchObject({ kind: 'paid', ratePerHour: 1 })
  })

  it('parses rates with more than 2 decimal digits', () => {
    const s = parseRateSchedule(THREE_DECIMAL_RATE)
    expect(s.windows[0]).toMatchObject({ kind: 'paid', ratePerHour: 1.005 })
  })

  it('falls back to the body for day/time when the header has none, e.g. "Motorcycle Parking Only"', () => {
    const s = parseRateSchedule(MOTORCYCLE_ONLY)
    expect(s.windows).toHaveLength(3)
    expect(s.windows[0]).toMatchObject({
      days: [1, 2, 3, 4, 5],
      startMin: 420,
      endMin: 1080,
      kind: 'noParking',
      ratePerHour: 0,
    })
    expect(s.windows[1]).toMatchObject({ days: [6], startMin: 420, endMin: 1080, kind: 'noParking' })
    const sunday = s.windows.find((w) => w.days.length === 1 && w.days[0] === 0)!
    expect(sunday.kind).toBe('free')
  })
})

describe('rateAt', () => {
  const s = parseRateSchedule(STANDARD)
  it('finds the paid window covering Tuesday 10:00', () => {
    expect(rateAt(s, 2, 600)).toMatchObject({ kind: 'paid', ratePerHour: 4 })
  })
  it('finds the Saturday window', () => {
    expect(rateAt(s, 6, 600)).toMatchObject({ kind: 'paid', ratePerHour: 1 })
  })
  it('returns the free window on Sunday', () => {
    expect(rateAt(s, 0, 600)).toMatchObject({ kind: 'free' })
  })
  it('returns null outside all windows (Tuesday 07:00)', () => {
    expect(rateAt(s, 2, 420)).toBeNull()
  })
})

describe('sanitizeRateHtml', () => {
  it('keeps only b and br tags', () => {
    expect(sanitizeRateHtml('<b>x</b><br><script>alert(1)</script><img src=x>')).toBe(
      '<b>x</b><br>',
    )
  })
})
