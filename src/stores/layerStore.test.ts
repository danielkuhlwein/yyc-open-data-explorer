import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from './layerStore'

describe('layerStore', () => {
  beforeEach(() => {
    useLayerStore.setState(useLayerStore.getInitialState())
  })

  it('has expected defaults', () => {
    const s = useLayerStore.getState()
    expect(s.traffic).toEqual({ incidents: true, cameras: true, heatmap: false, volumes: false })
    expect(s.parking.meteredCurbs).toBe(true)
    expect(s.development.notices).toBe(true)
  })

  it('toggle flips only the addressed key', () => {
    useLayerStore.getState().toggle('traffic', 'heatmap')
    const s = useLayerStore.getState()
    expect(s.traffic.heatmap).toBe(true)
    expect(s.traffic.incidents).toBe(true)
    expect(s.parking.meteredCurbs).toBe(true)
  })
})
