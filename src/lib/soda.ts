import type { FeatureCollection, GeoJsonProperties, Point } from 'geojson'

const BASE = 'https://data.calgary.ca/resource'

export interface SoqlParams {
  select?: string
  where?: string
  group?: string
  order?: string
  limit?: number
}

export function sodaUrl(
  datasetId: string,
  params: SoqlParams = {},
  format: 'json' | 'geojson' = 'json',
): string {
  const search = new URLSearchParams()
  if (params.select) search.set('$select', params.select)
  if (params.where) search.set('$where', params.where)
  if (params.group) search.set('$group', params.group)
  if (params.order) search.set('$order', params.order)
  if (params.limit != null) search.set('$limit', String(params.limit))
  const qs = search.toString()
  return `${BASE}/${datasetId}.${format}${qs ? `?${qs}` : ''}`
}

export function escapeSoqlString(value: string): string {
  return value.replaceAll("'", "''")
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `SODA request failed (${res.status}): ${url}${body ? ` — ${body.slice(0, 300)}` : ''}`,
    )
  }
  return res.json() as Promise<T>
}

export function fetchSoda<T>(
  datasetId: string,
  params: SoqlParams = {},
  signal?: AbortSignal,
): Promise<T[]> {
  return fetchJson<T[]>(sodaUrl(datasetId, params), signal)
}

export function fetchSodaGeoJSON(
  datasetId: string,
  params: SoqlParams = {},
  signal?: AbortSignal,
): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>(sodaUrl(datasetId, params, 'geojson'), signal)
}

export function pointsToFeatureCollection<T>(
  rows: T[],
  getCoords: (row: T) => [number, number] | null,
  getProps: (row: T) => GeoJsonProperties = () => ({}),
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: rows.flatMap((row) => {
      const coords = getCoords(row)
      if (!coords) return []
      return [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: coords },
          properties: getProps(row),
        },
      ]
    }),
  }
}
