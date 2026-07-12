import { describe, it, expect } from 'vitest'
import { incidentsToFC, camerasToFC } from './trafficTransforms'
import type { IncidentRow, CameraRow } from '../../lib/datasets'

describe('incidentsToFC', () => {
  it('converts rows and drops unparseable coordinates', () => {
    const rows: IncidentRow[] = [
      { incident_info: 'Crash at 5 Ave', description: 'Blocking', start_dt: '2026-07-11T08:00:00', latitude: '51.05', longitude: '-114.07' },
      { incident_info: 'Bad row', start_dt: '2026-07-11T08:00:00', latitude: '', longitude: '' },
    ]
    const fc = incidentsToFC(rows)
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].properties).toMatchObject({ incident_info: 'Crash at 5 Ave' })
  })
})

describe('camerasToFC', () => {
  it('uses the point geometry and flattens the camera url', () => {
    const rows: CameraRow[] = [
      {
        camera_url: { url: 'http://trafficcam.calgary.ca/loc86.jpg', description: 'Camera 87' },
        camera_location: 'Stoney Tr / Deerfoot Tr SE',
        point: { type: 'Point', coordinates: [-113.9766, 50.9007] },
      },
    ]
    const fc = camerasToFC(rows)
    expect(fc.features[0].geometry.coordinates).toEqual([-113.9766, 50.9007])
    expect(fc.features[0].properties).toMatchObject({
      url: 'http://trafficcam.calgary.ca/loc86.jpg',
      camera_location: 'Stoney Tr / Deerfoot Tr SE',
    })
  })
})
