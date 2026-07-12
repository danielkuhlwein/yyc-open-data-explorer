import { create } from 'zustand'

export interface ViewState {
  longitude: number
  latitude: number
  zoom: number
}

export const CALGARY: ViewState = { longitude: -114.0719, latitude: 51.0447, zoom: 10.5 }

interface MapState {
  viewState: ViewState
  setViewState: (v: ViewState) => void
}

export const useMapStore = create<MapState>()((set) => ({
  viewState: CALGARY,
  setViewState: (viewState) => set({ viewState }),
}))
