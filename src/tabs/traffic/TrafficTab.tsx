import { useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useCameras, useCurrentIncidents } from '../../hooks/useTraffic'
import { camerasToFC, incidentsToFC } from './trafficTransforms'
import CameraPopup from './CameraPopup'

type PopupState =
  | { kind: 'incident'; lngLat: [number, number]; props: Record<string, string> }
  | { kind: 'camera'; lngLat: [number, number]; props: Record<string, string> }

const incidentLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'incidents',
  type: 'circle',
  source: 'incidents',
  paint: {
    'circle-radius': 6,
    'circle-color': '#d03b3b',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const cameraLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'cameras',
  type: 'circle',
  source: 'cameras',
  paint: {
    'circle-radius': 5,
    'circle-color': dark ? '#3987e5' : '#2a78d6',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

export default function TrafficTab() {
  const layers = useLayerStore((s) => s.traffic)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [popup, setPopup] = useState<PopupState | null>(null)

  const incidents = useCurrentIncidents(layers.incidents)
  const cameras = useCameras(layers.cameras)

  const incidentsFC = useMemo(() => incidentsToFC(incidents.data ?? []), [incidents.data])
  const camerasFC = useMemo(() => camerasToFC(cameras.data ?? []), [cameras.data])

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature) {
      setPopup(null)
      return
    }
    const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    if (feature.layer.id === 'incidents') {
      setPopup({ kind: 'incident', lngLat, props: feature.properties as Record<string, string> })
    } else if (feature.layer.id === 'cameras') {
      setPopup({ kind: 'camera', lngLat, props: feature.properties as Record<string, string> })
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapCanvas
        interactiveLayerIds={['incidents', 'cameras'].filter(
          (id) => layers[id as 'incidents' | 'cameras'],
        )}
        onClick={onClick}
      >
        {layers.incidents && (
          <Source id="incidents" type="geojson" data={incidentsFC}>
            <Layer {...incidentLayer(dark)} />
          </Source>
        )}
        {layers.cameras && (
          <Source id="cameras" type="geojson" data={camerasFC}>
            <Layer {...cameraLayer(dark)} />
          </Source>
        )}
        {popup && (
          <Popup
            longitude={popup.lngLat[0]}
            latitude={popup.lngLat[1]}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            maxWidth="340px"
          >
            {popup.kind === 'camera' ? (
              <CameraPopup url={popup.props.url} location={popup.props.camera_location} />
            ) : (
              <div className="max-w-72 space-y-1 text-stone-900">
                <p className="text-sm font-medium">{popup.props.incident_info}</p>
                <p className="text-xs">{popup.props.description}</p>
                <p className="text-xs text-stone-500">
                  Started {new Date(popup.props.start_dt).toLocaleString()}
                </p>
              </div>
            )}
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            { key: 'incidents', label: 'Live incidents', checked: layers.incidents, onChange: () => toggle('traffic', 'incidents') },
            { key: 'cameras', label: 'Traffic cameras', checked: layers.cameras, onChange: () => toggle('traffic', 'cameras') },
          ]}
        />
      </div>
    </div>
  )
}
