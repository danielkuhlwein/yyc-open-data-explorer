import { describe, it, expect } from 'vitest'
import { sodaUrl, escapeSoqlString, pointsToFeatureCollection } from './soda'

describe('sodaUrl', () => {
  it('builds a bare url with no params', () => {
    expect(sodaUrl('abcd-1234')).toBe('https://data.calgary.ca/resource/abcd-1234.json')
  })
  it('encodes $-params', () => {
    const url = sodaUrl('abcd-1234', {
      select: 'latitude,longitude',
      where: "start_dt > '2026-01-01'",
      limit: 50000,
    })
    expect(url).toContain('%24select=latitude%2Clongitude')
    expect(url).toContain('%24where=start_dt+%3E+%272026-01-01%27')
    expect(url).toContain('%24limit=50000')
  })
  it('supports geojson format', () => {
    expect(sodaUrl('abcd-1234', {}, 'geojson')).toBe(
      'https://data.calgary.ca/resource/abcd-1234.geojson',
    )
  })
})

describe('escapeSoqlString', () => {
  it('doubles single quotes', () => {
    expect(escapeSoqlString("O'Brien")).toBe("O''Brien")
  })
})

describe('pointsToFeatureCollection', () => {
  it('maps rows to features and skips rows without coordinates', () => {
    const rows = [
      { latitude: '51.05', longitude: '-114.07', name: 'a' },
      { latitude: '', longitude: '', name: 'b' },
    ]
    const fc = pointsToFeatureCollection(
      rows,
      (r) => {
        const lat = Number(r.latitude)
        const lon = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 ? [lon, lat] : null
      },
      (r) => ({ name: r.name }),
    )
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [-114.07, 51.05] })
    expect(fc.features[0].properties).toEqual({ name: 'a' })
  })
})
