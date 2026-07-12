import { useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import LayerStatus from '../../components/LayerStatus'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useParkingZones, useResidentialZones, useSchoolZones } from '../../hooks/useParking'
import { parseRateSchedule, type ParsedSchedule } from '../../lib/rateSchedule'
import type { ParkingZoneProps } from '../../lib/datasets'
import { curbColor } from './parkingColors'
import TimeSelector, { nowSelection, type TimeSelection } from './TimeSelector'
import ParkingPopup from './ParkingPopup'

const curbLayer: LineLayerSpecification = {
  id: 'curbs',
  type: 'line',
  source: 'curbs',
  paint: {
    'line-color': ['get', 'curbColor'],
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 5],
    'line-opacity': 0.9,
  },
}

const residentialLayer = (dark: boolean): FillLayerSpecification => ({
  id: 'residential',
  type: 'fill',
  source: 'residential',
  paint: {
    'fill-color': dark ? '#9085e9' : '#4a3aa7',
    'fill-opacity': 0.15,
    'fill-outline-color': dark ? '#9085e9' : '#4a3aa7',
  },
})

const schoolLayer = (dark: boolean): LineLayerSpecification => ({
  id: 'school',
  type: 'line',
  source: 'school',
  paint: {
    'line-color': dark ? '#c98500' : '#eda100',
    'line-width': 2,
    'line-dasharray': [2, 1],
  },
})

export default function ParkingTab() {
  const layers = useLayerStore((s) => s.parking)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [time, setTime] = useState<TimeSelection>(nowSelection)
  const [popup, setPopup] = useState<{ lngLat: [number, number]; props: ParkingZoneProps } | null>(null)

  const zones = useParkingZones(layers.meteredCurbs)
  const residential = useResidentialZones(layers.residentialZones)
  const school = useSchoolZones(layers.schoolZones)

  const parsedZones = useMemo(() => {
    if (!zones.data) return undefined
    const cache = new Map<string, ParsedSchedule>()
    return zones.data.features.map((feature) => {
      const html = (feature.properties as ParkingZoneProps | null)?.html_zone_rate ?? ''
      let schedule = cache.get(html)
      if (!schedule) {
        schedule = parseRateSchedule(html)
        cache.set(html, schedule)
      }
      return { feature, schedule }
    })
  }, [zones.data])

  const coloredZones = useMemo<FeatureCollection | undefined>(() => {
    if (!parsedZones) return undefined
    return {
      type: 'FeatureCollection',
      features: parsedZones.map(({ feature, schedule }) => ({
        ...feature,
        properties: {
          ...feature.properties,
          curbColor: curbColor(schedule, time.day, time.minutes, dark),
        },
      })),
    }
  }, [parsedZones, time, dark])

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (feature?.layer.id === 'curbs') {
      setPopup({
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        props: feature.properties as ParkingZoneProps,
      })
    } else {
      setPopup(null)
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapCanvas interactiveLayerIds={layers.meteredCurbs ? ['curbs'] : []} onClick={onClick}>
        {layers.residentialZones && residential.data && (
          <Source id="residential" type="geojson" data={residential.data}>
            <Layer {...residentialLayer(dark)} />
          </Source>
        )}
        {layers.schoolZones && school.data && (
          <Source id="school" type="geojson" data={school.data}>
            <Layer {...schoolLayer(dark)} />
          </Source>
        )}
        {layers.meteredCurbs && coloredZones && (
          <Source id="curbs" type="geojson" data={coloredZones}>
            <Layer {...curbLayer} />
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
            <ParkingPopup props={popup.props} />
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            {
              key: 'meteredCurbs',
              label: 'Metered curbs (by rate)',
              checked: layers.meteredCurbs,
              onChange: () => toggle('parking', 'meteredCurbs'),
              status: (
                <LayerStatus
                  isError={zones.isError}
                  isFetching={zones.isFetching}
                  dataUpdatedAt={zones.dataUpdatedAt}
                />
              ),
            },
            {
              key: 'residentialZones',
              label: 'Residential permit zones',
              checked: layers.residentialZones,
              onChange: () => toggle('parking', 'residentialZones'),
              status: (
                <LayerStatus
                  isError={residential.isError}
                  isFetching={residential.isFetching}
                  dataUpdatedAt={residential.dataUpdatedAt}
                />
              ),
            },
            {
              key: 'schoolZones',
              label: 'School zones',
              checked: layers.schoolZones,
              onChange: () => toggle('parking', 'schoolZones'),
              status: (
                <LayerStatus
                  isError={school.isError}
                  isFetching={school.isFetching}
                  dataUpdatedAt={school.dataUpdatedAt}
                />
              ),
            },
          ]}
        >
          {layers.meteredCurbs && (
            <>
              <TimeSelector value={time} onChange={setTime} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[10px] text-stone-500 dark:text-zinc-400">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#199e70' : '#1baf7a' }} />Free</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#6da7ec' : '#9ec5f4' }} />$1</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#cde2fb' : '#0d366b' }} />$5+</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#e66767' : '#d03b3b' }} />No parking</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: '#898781' }} />Other</span>
              </div>
            </>
          )}
        </LayerPanel>
      </div>
    </div>
  )
}
