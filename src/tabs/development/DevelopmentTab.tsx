import { useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useBuildingPermits, useDevPermits, useNotices } from '../../hooks/useDevelopment'
import { CATEGORY_OPTIONS, STATUS_OPTIONS, type DevFilters } from './devFilters'
import { BuildingPermitPopup, DevPermitPopup, NoticePopup } from './DevPopups'

type PopupState = { layer: string; lngLat: [number, number]; props: Record<string, string> }

const noticeLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'notices',
  type: 'circle',
  source: 'notices',
  paint: {
    'circle-radius': 7,
    'circle-color': dark ? '#c98500' : '#eda100',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const devPermitLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'dev-permits',
  type: 'circle',
  source: 'dev-permits',
  paint: {
    'circle-radius': 4,
    'circle-color': dark ? '#9085e9' : '#4a3aa7',
    'circle-opacity': 0.75,
    'circle-stroke-width': 1,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const buildingLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'building-permits',
  type: 'circle',
  source: 'building-permits',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['sqrt', ['get', 'cost']],
      0, 2, 1000, 6, 3200, 12, 10000, 22,
    ],
    'circle-color': dark ? '#d95926' : '#eb6834',
    'circle-opacity': 0.45,
    'circle-stroke-width': 1,
    'circle-stroke-color': dark ? '#d95926' : '#eb6834',
  },
})

export default function DevelopmentTab() {
  const layers = useLayerStore((s) => s.development)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [filters, setFilters] = useState<DevFilters>({ months: 24, status: 'all', category: 'all' })
  const [popup, setPopup] = useState<PopupState | null>(null)

  const notices = useNotices(layers.notices)
  const devPermits = useDevPermits(filters, layers.devPermits)
  const building = useBuildingPermits(layers.buildingPermits)

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature) {
      setPopup(null)
      return
    }
    setPopup({
      layer: feature.layer.id,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      props: feature.properties as Record<string, string>,
    })
  }

  const interactive = [
    layers.notices && 'notices',
    layers.devPermits && 'dev-permits',
    layers.buildingPermits && 'building-permits',
  ].filter(Boolean) as string[]

  return (
    <div className="relative h-full w-full">
      <MapCanvas interactiveLayerIds={interactive} onClick={onClick}>
        {layers.buildingPermits && building.data && (
          <Source id="building-permits" type="geojson" data={building.data}>
            <Layer {...buildingLayer(dark)} />
          </Source>
        )}
        {layers.devPermits && devPermits.data && (
          <Source id="dev-permits" type="geojson" data={devPermits.data}>
            <Layer {...devPermitLayer(dark)} />
          </Source>
        )}
        {layers.notices && notices.data && (
          <Source id="notices" type="geojson" data={notices.data}>
            <Layer {...noticeLayer(dark)} />
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
            {popup.layer === 'notices' ? (
              <NoticePopup props={popup.props} />
            ) : popup.layer === 'dev-permits' ? (
              <DevPermitPopup props={popup.props} />
            ) : (
              <BuildingPermitPopup props={popup.props} />
            )}
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            { key: 'notices', label: 'Current public notices', checked: layers.notices, onChange: () => toggle('development', 'notices') },
            { key: 'devPermits', label: 'Development permits', checked: layers.devPermits, onChange: () => toggle('development', 'devPermits') },
            { key: 'buildingPermits', label: 'Building permits (by cost)', checked: layers.buildingPermits, onChange: () => toggle('development', 'buildingPermits') },
          ]}
        >
          {layers.devPermits && (
            <div className="space-y-1 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
              <label className="flex items-center gap-2">
                Applied within
                <select
                  value={filters.months}
                  onChange={(e) => setFilters({ ...filters, months: Number(e.target.value) as DevFilters['months'] })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  {[3, 6, 12, 24].map((m) => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Status
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Category
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  <option value="all">All</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <p className="text-[10px] text-stone-400">
                Note: new applications appear in the city feed ~6–8 weeks after filing.
              </p>
            </div>
          )}
        </LayerPanel>
      </div>
    </div>
  )
}
