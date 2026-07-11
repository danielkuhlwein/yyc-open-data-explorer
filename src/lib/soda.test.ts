import { describe, it, expect, vi, afterEach } from 'vitest'
import { sodaUrl, escapeSoqlString, pointsToFeatureCollection, fetchSoda } from './soda'

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
  it('encodes $group and $order when provided', () => {
    const url = sodaUrl('abcd-1234', { group: 'quadrant', order: 'start_dt DESC' })
    expect(url).toContain('%24group=quadrant')
    expect(url).toContain('%24order=start_dt+DESC')
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
  it('defaults properties to an empty object when getProps is omitted', () => {
    const fc = pointsToFeatureCollection(
      [{ latitude: '51.05', longitude: '-114.07' }],
      () => [-114.07, 51.05],
    )
    expect(fc.features[0].properties).toEqual({})
  })
})

describe('fetchSoda', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws with status and body excerpt on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => '{"code":"query.soql.no-such-column"}',
      })),
    )
    await expect(fetchSoda('abcd-1234')).rejects.toThrow(
      'SODA request failed (400): https://data.calgary.ca/resource/abcd-1234.json — {"code":"query.soql.no-such-column"}',
    )
  })

  it('resolves rows and forwards the abort signal to fetch', async () => {
    const rows = [{ corridor: 'Deerfoot Trail' }]
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => rows }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await expect(fetchSoda('abcd-1234', {}, controller.signal)).resolves.toEqual(rows)
    expect(fetchMock).toHaveBeenCalledWith('https://data.calgary.ca/resource/abcd-1234.json', {
      signal: controller.signal,
    })
  })
})
