import { useQuery } from '@tanstack/react-query'
import { DATASETS, type CameraRow, type HeatPointRow, type IncidentRow, type TravelTimeRow } from '../lib/datasets'
import { fetchSoda, fetchSodaGeoJSON, pointsToFeatureCollection } from '../lib/soda'
import { compileHeatmapParams, type HeatmapFilters } from '../tabs/traffic/heatmapFilters'

export function useCurrentIncidents(enabled: boolean) {
  return useQuery({
    queryKey: ['incidents-current'],
    queryFn: ({ signal }) =>
      fetchSoda<IncidentRow>(DATASETS.trafficIncidentsCurrent, { limit: 500 }, signal),
    refetchInterval: 60_000,
    enabled,
  })
}

export function useCameras(enabled: boolean) {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: ({ signal }) =>
      fetchSoda<CameraRow>(DATASETS.trafficCameras, { limit: 500 }, signal),
    enabled,
  })
}

export function useTravelTimes(enabled: boolean) {
  return useQuery({
    queryKey: ['travel-times'],
    queryFn: ({ signal }) =>
      fetchSoda<TravelTimeRow>(
        DATASETS.travelTimes,
        { limit: 500, order: 'corridor,road_segment' },
        signal,
      ),
    refetchInterval: 60_000,
    enabled,
  })
}

export function useIncidentHeatmap(filters: HeatmapFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['incident-heatmap', filters],
    queryFn: async ({ signal }) => {
      const rows = await fetchSoda<HeatPointRow>(
        DATASETS.trafficIncidentsHistorical,
        compileHeatmapParams(filters, new Date()),
        signal,
      )
      return pointsToFeatureCollection(rows, (r) => {
        const lat = Number(r.latitude)
        const lon = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 ? [lon, lat] : null
      })
    },
    enabled,
  })
}

export function useVolumes(datasetId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['volumes', datasetId],
    queryFn: ({ signal }) => fetchSodaGeoJSON(datasetId!, { limit: 5000 }, signal),
    enabled: enabled && !!datasetId,
  })
}
