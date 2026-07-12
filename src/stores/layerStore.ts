import { create } from 'zustand'

export type TrafficLayerKey = 'incidents' | 'cameras' | 'heatmap' | 'volumes'
export type ParkingLayerKey = 'meteredCurbs' | 'residentialZones' | 'schoolZones'
export type DevLayerKey = 'notices' | 'devPermits' | 'buildingPermits'

export type TabKey = 'traffic' | 'parking' | 'development'

interface LayerState {
  traffic: Record<TrafficLayerKey, boolean>
  parking: Record<ParkingLayerKey, boolean>
  development: Record<DevLayerKey, boolean>
  toggle: (tab: TabKey, key: TrafficLayerKey | ParkingLayerKey | DevLayerKey) => void
}

export const useLayerStore = create<LayerState>()((set) => ({
  traffic: { incidents: true, cameras: true, heatmap: false, volumes: false },
  parking: { meteredCurbs: true, residentialZones: false, schoolZones: false },
  development: { notices: true, devPermits: false, buildingPermits: false },
  toggle: (tab, key) =>
    set((state) => ({
      [tab]: { ...state[tab], [key]: !(state[tab] as Record<string, boolean>)[key] },
    })),
}))
