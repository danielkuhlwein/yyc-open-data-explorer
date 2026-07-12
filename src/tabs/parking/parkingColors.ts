import { rateAt, type ParsedSchedule } from '../../lib/rateSchedule'

export const PARKING_COLORS = {
  light: { free: '#1baf7a', noParking: '#d03b3b', unknown: '#898781' },
  dark: { free: '#199e70', noParking: '#e66767', unknown: '#898781' },
} as const

// $/hr -> color; light mode darkens with price, dark mode lightens (visibility on dark surface).
const RATE_STOPS_LIGHT: Array<[number, string]> = [
  [1, '#9ec5f4'], [2, '#6da7ec'], [3, '#3987e5'], [4, '#256abf'], [5, '#0d366b'],
]
const RATE_STOPS_DARK: Array<[number, string]> = [
  [1, '#6da7ec'], [2, '#86b6ef'], [3, '#9ec5f4'], [4, '#b7d3f6'], [5, '#cde2fb'],
]

export function rateColor(ratePerHour: number, dark: boolean): string {
  const stops = dark ? RATE_STOPS_DARK : RATE_STOPS_LIGHT
  for (const [max, color] of stops) {
    if (ratePerHour <= max) return color
  }
  return stops[stops.length - 1][1]
}

export function curbColor(
  schedule: ParsedSchedule,
  day: number,
  minutes: number,
  dark: boolean,
): string {
  const mode = dark ? PARKING_COLORS.dark : PARKING_COLORS.light
  if (schedule.windows.length === 0) return mode.unknown
  const window = rateAt(schedule, day, minutes)
  if (!window || window.kind === 'free') return mode.free
  if (window.kind === 'noParking') return mode.noParking
  return rateColor(window.ratePerHour, dark)
}
