import { useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type {
  CircleLayerSpecification,
  HeatmapLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useCameras, useCurrentIncidents, useIncidentHeatmap, useVolumes } from '../../hooks/useTraffic'
import { camerasToFC, incidentsToFC } from './trafficTransforms'
import CameraPopup from './CameraPopup'
import HeatmapControls from './HeatmapControls'
import type { HeatmapFilters } from './heatmapFilters'
import { VOLUME_YEARS, volumeLineColor, volumeLineWidth } from './volumeStyle'

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

const heatmapLayer = (dark: boolean): HeatmapLayerSpecification => ({
  id: 'incident-heat',
  type: 'heatmap',
  source: 'incident-heat',
  paint: {
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 8, 14, 24],
    'heatmap-opacity': 0.75,
    'heatmap-color': dark
      ? ['interpolate', ['linear'], ['heatmap-density'],
         0, 'rgba(24, 79, 149, 0)', 0.2, '#184f95', 0.5, '#3987e5', 0.8, '#86b6ef', 1, '#cde2fb']
      : ['interpolate', ['linear'], ['heatmap-density'],
         0, 'rgba(158, 197, 244, 0)', 0.2, '#9ec5f4', 0.5, '#5598e7', 0.8, '#256abf', 1, '#0d366b'],
  },
})

const volumeLayer = (dark: boolean): LineLayerSpecification => ({
  id: 'volumes',
  type: 'line',
  source: 'volumes',
  paint: {
    'line-color': volumeLineColor(dark),
    'line-width': volumeLineWidth(),
    'line-opacity': 0.8,
  },
})

export default function TrafficTab() {
  const layers = useLayerStore((s) => s.traffic)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [popup, setPopup] = useState<PopupState | null>(null)

  const incidents = useCurrentIncidents(layers.incidents)
  const cameras = useCameras(layers.cameras)

  const [heatFilters, setHeatFilters] = useState<HeatmapFilters>({
    preset: '1y',
    hourFrom: 0,
    hourTo: 23,
    days: 'all',
  })
  const heatmap = useIncidentHeatmap(heatFilters, layers.heatmap)

  const [volumeYear, setVolumeYear] = useState(VOLUME_YEARS[0].year)
  const volumeDatasetId = VOLUME_YEARS.find((y) => y.year === volumeYear)?.id
  const volumes = useVolumes(volumeDatasetId, layers.volumes)

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
        {layers.heatmap && heatmap.data && (
          <Source id="incident-heat" type="geojson" data={heatmap.data}>
            <Layer {...heatmapLayer(dark)} />
          </Source>
        )}
        {layers.volumes && volumes.data && (
          <Source id="volumes" type="geojson" data={volumes.data}>
            <Layer {...volumeLayer(dark)} />
          </Source>
        )}
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
            { key: 'heatmap', label: 'Incident history heatmap', checked: layers.heatmap, onChange: () => toggle('traffic', 'heatmap') },
            { key: 'volumes', label: 'Traffic volumes (annual)', checked: layers.volumes, onChange: () => toggle('traffic', 'volumes') },
          ]}
        >
          <>
            {layers.heatmap && <HeatmapControls filters={heatFilters} onChange={setHeatFilters} />}
            {layers.volumes && (
              <label className="flex items-center gap-2 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
                Year
                <select
                  value={volumeYear}
                  onChange={(e) => setVolumeYear(Number(e.target.value))}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  {VOLUME_YEARS.map((y) => (
                    <option key={y.year} value={y.year}>{y.year}</option>
                  ))}
                </select>
                <span className="text-stone-400">2020–21: not published</span>
              </label>
            )}
          </>
        </LayerPanel>
      </div>
    </div>
  )
}
