import type { ReactNode } from 'react'
import { Map } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import { useMapStore } from '../stores/mapStore'
import { usePrefersDark, MAP_STYLES } from '../theme'

interface Props {
  children?: ReactNode
  interactiveLayerIds?: string[]
  onClick?: (e: MapLayerMouseEvent) => void
}

export default function MapCanvas({ children, interactiveLayerIds, onClick }: Props) {
  const viewState = useMapStore((s) => s.viewState)
  const setViewState = useMapStore((s) => s.setViewState)
  const dark = usePrefersDark()

  return (
    <Map
      {...viewState}
      onMove={(e) => setViewState(e.viewState)}
      mapStyle={dark ? MAP_STYLES.dark : MAP_STYLES.light}
      interactiveLayerIds={interactiveLayerIds}
      onClick={onClick}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </Map>
  )
}
