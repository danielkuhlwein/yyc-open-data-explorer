import type { FeatureCollection, Point } from 'geojson'
import { pointsToFeatureCollection } from '../../lib/soda'
import type { CameraRow, IncidentRow } from '../../lib/datasets'

function parseLatLon(lat: string, lon: string): [number, number] | null {
  const la = Number(lat)
  const lo = Number(lon)
  return Number.isFinite(la) && Number.isFinite(lo) && la !== 0 && lo !== 0 ? [lo, la] : null
}

export function incidentsToFC(rows: IncidentRow[]): FeatureCollection<Point> {
  return pointsToFeatureCollection(
    rows,
    (r) => parseLatLon(r.latitude, r.longitude),
    (r) => ({
      incident_info: r.incident_info,
      description: r.description ?? '',
      start_dt: r.start_dt,
      quadrant: r.quadrant ?? '',
    }),
  )
}

export function camerasToFC(rows: CameraRow[]): FeatureCollection<Point> {
  return pointsToFeatureCollection(
    rows,
    (r) => (r.point ? r.point.coordinates : null),
    (r) => ({
      url: r.camera_url?.url ?? '',
      camera_location: r.camera_location,
      quadrant: r.quadrant ?? '',
    }),
  )
}
