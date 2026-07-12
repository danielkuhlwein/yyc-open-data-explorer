import { describe, it, expect } from 'vitest'
import { buildDevPermitParams, type DevFilters } from './devFilters'

const NOW = new Date('2026-07-11T12:00:00Z')

describe('buildDevPermitParams', () => {
  it('windows by applieddate and requires a location', () => {
    const f: DevFilters = { months: 24, status: 'all', category: 'all' }
    const p = buildDevPermitParams(f, NOW)
    expect(p.where).toBe("applieddate > '2024-07-11' AND point IS NOT NULL")
    expect(p.limit).toBe(50000)
    expect(p.select).toContain('permitnum')
  })

  it('adds escaped status and category clauses', () => {
    const f: DevFilters = { months: 6, status: "O'Brien", category: 'Residential' }
    const p = buildDevPermitParams(f, NOW)
    expect(p.where).toContain("statuscurrent = 'O''Brien'")
    expect(p.where).toContain("category = 'Residential'")
  })
})
