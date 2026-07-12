import { useQuery } from '@tanstack/react-query'
import { DATASETS, type CameraRow, type IncidentRow, type TravelTimeRow } from '../lib/datasets'
import { fetchSoda } from '../lib/soda'

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
