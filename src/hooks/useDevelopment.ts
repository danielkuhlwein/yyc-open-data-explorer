import { useQuery } from '@tanstack/react-query'
import {
  DATASETS,
  type BuildingPermitRow,
  type DevPermitRow,
  type NoticeRow,
} from '../lib/datasets'
import { fetchSoda, pointsToFeatureCollection } from '../lib/soda'
import { buildDevPermitParams, type DevFilters } from '../tabs/development/devFilters'

const pointCoords = (r: { point?: { coordinates: [number, number] } }) =>
  r.point?.coordinates ?? null

export function useNotices(enabled: boolean) {
  return useQuery({
    queryKey: ['dev-notices'],
    queryFn: async ({ signal }) => {
      const rows = await fetchSoda<NoticeRow>(DATASETS.devPermitNotices, { limit: 1000 }, signal)
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        file: r.xtrnl_file_no ?? '',
        description: r.job_dscrn ?? '',
        status: r.job_sta_lng_dscrn ?? '',
        address: r.posse_addr ?? '',
        adStart: r.dp_ad_dt ?? '',
        adEnd: r.dp_ad_end_dt ?? '',
        community: r.com_nm ?? '',
      }))
    },
    enabled,
  })
}

export function useDevPermits(filters: DevFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['dev-permits', filters],
    queryFn: async ({ signal }) => {
      const rows = await fetchSoda<DevPermitRow>(
        DATASETS.developmentPermits,
        buildDevPermitParams(filters, new Date()),
        signal,
      )
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        permitnum: r.permitnum,
        address: r.address ?? '',
        category: r.category ?? '',
        description: r.description ?? '',
        status: r.statuscurrent ?? '',
        applied: r.applieddate ?? '',
        decision: r.decision ?? '',
        decisionDate: r.decisiondate ?? '',
        community: r.communityname ?? '',
      }))
    },
    enabled,
  })
}

export function useBuildingPermits(enabled: boolean) {
  return useQuery({
    queryKey: ['building-permits'],
    queryFn: async ({ signal }) => {
      const since = new Date()
      since.setUTCFullYear(since.getUTCFullYear() - 1)
      const rows = await fetchSoda<BuildingPermitRow>(
        DATASETS.buildingPermits,
        {
          select:
            'permitnum,statuscurrent,applieddate,estprojectcost,totalsqft,housingunits,contractorname,originaladdress,communityname,point',
          where: `applieddate > '${since.toISOString().slice(0, 10)}' AND point IS NOT NULL AND estprojectcost IS NOT NULL`,
          limit: 50000,
        },
        signal,
      )
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        permitnum: r.permitnum,
        status: r.statuscurrent ?? '',
        applied: r.applieddate ?? '',
        cost: Number(r.estprojectcost ?? 0),
        sqft: r.totalsqft ?? '',
        units: r.housingunits ?? '',
        contractor: r.contractorname ?? '',
        address: r.originaladdress ?? '',
        community: r.communityname ?? '',
      }))
    },
    enabled,
  })
}
