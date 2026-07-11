import { describe, it, expect } from 'vitest'
import { csvEscape, toCsvLines, maxLastUpdate, assertUsableFeed } from './collect-travel-times.mjs'

const rows = [
  { corridor: 'Deerfoot Trail', road_segment: 'NB Deerfoot Tr: 17 Ave SE to Stoney Tr NE', travel_time_mins: '12', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Crowchild Trail', road_segment: 'SB Crowchild Tr: 24 Ave NW to Bow Tr SW', travel_time_mins: '8', last_update: '2026-07-11T13:01:00.000' },
]

describe('csvEscape', () => {
  it('passes plain values through', () => {
    expect(csvEscape('Deerfoot Trail')).toBe('Deerfoot Trail')
  })
  it('quotes values containing commas and escapes quotes', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
  })
  it('quotes values containing newlines', () => {
    expect(csvEscape('a\nb')).toBe('"a\nb"')
  })
  it('quotes values containing carriage returns', () => {
    expect(csvEscape('a\rb')).toBe('"a\rb"')
  })
})

describe('toCsvLines', () => {
  it('emits one line per row, sorted by corridor then segment, with fetched_at first', () => {
    const lines = toCsvLines(rows, '2026-07-11T13:10:00.000Z')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      '2026-07-11T13:10:00.000Z,Crowchild Trail,SB Crowchild Tr: 24 Ave NW to Bow Tr SW,8,2026-07-11T13:01:00.000',
    )
    expect(lines[1].startsWith('2026-07-11T13:10:00.000Z,Deerfoot Trail,')).toBe(true)
  })
  it('sorts corridor and segment as separate keys when one corridor prefixes another', () => {
    const prefixRows = [
      { corridor: 'AB', road_segment: 'C', travel_time_mins: '1', last_update: 'x' },
      { corridor: 'A', road_segment: 'D', travel_time_mins: '2', last_update: 'y' },
    ]
    const lines = toCsvLines(prefixRows, 'T')
    expect(lines[0]).toBe('T,A,D,2,y')
    expect(lines[1]).toBe('T,AB,C,1,x')
  })
})

describe('maxLastUpdate', () => {
  it('returns the lexicographically greatest last_update', () => {
    expect(maxLastUpdate(rows)).toBe('2026-07-11T13:03:55.000')
  })
  it('returns empty string for empty input', () => {
    expect(maxLastUpdate([])).toBe('')
  })
})

describe('assertUsableFeed', () => {
  it('throws when the feed is not an array', () => {
    expect(() => assertUsableFeed({ error: true })).toThrow('feed returned no rows')
  })
  it('throws when the feed is empty', () => {
    expect(() => assertUsableFeed([])).toThrow('feed returned no rows')
  })
  it('throws when rows are missing last_update', () => {
    expect(() =>
      assertUsableFeed([{ corridor: 'X', road_segment: 'Y', travel_time_mins: '1' }]),
    ).toThrow('feed rows missing last_update')
  })
  it('accepts usable rows', () => {
    expect(() => assertUsableFeed(rows)).not.toThrow()
  })
})
