import { describe, it, expect } from 'vitest'
import { compileHeatmapParams, type HeatmapFilters } from './heatmapFilters'

const NOW = new Date('2026-07-11T12:00:00Z')

describe('compileHeatmapParams', () => {
  it('compiles preset 30d with full hours and all days', () => {
    const f: HeatmapFilters = { preset: '30d', hourFrom: 0, hourTo: 23, days: 'all' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.select).toBe('latitude,longitude')
    expect(p.where).toBe("start_dt > '2026-06-11T12:00:00'")
    expect(p.limit).toBe(70000)
  })

  it('adds hour range and weekday clauses', () => {
    const f: HeatmapFilters = { preset: '1y', hourFrom: 7, hourTo: 9, days: 'weekday' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.where).toBe(
      "start_dt > '2025-07-11T12:00:00' AND date_extract_hh(start_dt) between 7 and 9 AND date_extract_dow(start_dt) between 1 and 5",
    )
  })

  it('compiles weekend as dow in (0, 6) and omits date clause for all-time', () => {
    const f: HeatmapFilters = { preset: 'all', hourFrom: 0, hourTo: 23, days: 'weekend' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.where).toBe('date_extract_dow(start_dt) in (0, 6)')
  })
})
