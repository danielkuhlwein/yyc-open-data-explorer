import { describe, it, expect } from 'vitest'
import { curbColor, PARKING_COLORS } from './parkingColors'
import { parseRateSchedule } from '../../lib/rateSchedule'

const PAID = parseRateSchedule('<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>$4.00 per Hour<br><br>')
const EMPTY = parseRateSchedule('<b>Loading zone:</b><br><br>Free 5 mins<br><br>')

describe('curbColor', () => {
  it('colors paid windows by rate on the sequential ramp', () => {
    expect(curbColor(PAID, 2, 600, false)).toBe('#256abf') // $4 -> 4th stop, light mode
  })
  it('colors free (outside windows) with the free color', () => {
    expect(curbColor(PAID, 0, 600, false)).toBe(PARKING_COLORS.light.free)
  })
  it('colors unparseable schedules with the unknown color', () => {
    expect(curbColor(EMPTY, 2, 600, false)).toBe(PARKING_COLORS.light.unknown)
  })
})
