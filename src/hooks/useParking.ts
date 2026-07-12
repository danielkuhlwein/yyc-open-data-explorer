import { useQuery } from '@tanstack/react-query'
import { DATASETS } from '../lib/datasets'
import { fetchSodaGeoJSON } from '../lib/soda'

export function useParkingZones(enabled: boolean) {
  return useQuery({
    queryKey: ['parking-zones'],
    queryFn: ({ signal }) => fetchSodaGeoJSON(DATASETS.parkingZonesWithRates, { limit: 5000 }, signal),
    enabled,
  })
}

export function useResidentialZones(enabled: boolean) {
  return useQuery({
    queryKey: ['residential-zones'],
    queryFn: ({ signal }) => fetchSodaGeoJSON(DATASETS.residentialParkingPolygons, { limit: 5000 }, signal),
    enabled,
  })
}

export function useSchoolZones(enabled: boolean) {
  return useQuery({
    queryKey: ['school-zones'],
    queryFn: ({ signal }) => fetchSodaGeoJSON(DATASETS.schoolParkingZones, { limit: 5000 }, signal),
    enabled,
  })
}
