export const DATASETS = {
  trafficIncidentsHistorical: '35ra-9556',
  trafficIncidentsCurrent: '4jah-h97u',
  trafficCameras: 'k7p9-kppz',
  travelTimes: 'aeb8-fh2w',
  parkingZonesWithRates: '45az-7kh9',
  residentialParkingPolygons: 'qzsa-aeqp',
  schoolParkingZones: '9hbw-zj92',
  developmentPermits: '6933-unw5',
  devPermitNotices: '8rd9-gix2',
  buildingPermits: 'c2es-76ed',
} as const

// 2020 and 2021 volume datasets were never published by the city (COVID gap).
export const VOLUME_DATASETS: Record<number, string | null | undefined> = {
  2016: '6wve-2ets',
  2017: 'nvuz-qykn',
  2018: 'wwf6-cpsg',
  2019: 'qeqv-tb2c',
  2020: null,
  2021: null,
  2022: '57me-rcwr',
  2023: 'bjag-w7zi',
  2024: 'cauu-7hnw',
}

export interface SodaPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface IncidentRow {
  incident_info: string
  description?: string
  start_dt: string
  modified_dt?: string
  quadrant?: string
  latitude: string
  longitude: string
}

export interface CameraRow {
  camera_url: { url: string; description?: string }
  quadrant?: string
  camera_location: string
  point: SodaPoint
}

export interface TravelTimeRow {
  corridor: string
  road_segment: string
  travel_time_mins: string
  last_update: string
}

export interface HeatPointRow {
  latitude: string
  longitude: string
}

export interface NoticeRow {
  xtrnl_file_no?: string
  job_dscrn?: string
  job_sta_lng_dscrn?: string
  posse_addr?: string
  dp_ad_dt?: string
  dp_ad_end_dt?: string
  com_nm?: string
  point?: SodaPoint
}

export interface DevPermitRow {
  permitnum: string
  address?: string
  category?: string
  description?: string
  statuscurrent?: string
  applieddate?: string
  decision?: string
  decisiondate?: string
  communityname?: string
  point?: SodaPoint
}

export interface BuildingPermitRow {
  permitnum: string
  statuscurrent?: string
  applieddate?: string
  estprojectcost?: string
  totalsqft?: string
  housingunits?: string
  contractorname?: string
  originaladdress?: string
  communityname?: string
  point?: SodaPoint
}

export interface ParkingZoneProps {
  permit_zone?: string
  address_desc?: string
  price_zone?: string
  html_zone_rate?: string
  enforceable_time?: string
  max_time?: string
  stall_type?: string
  zone_type?: string
  status?: string
  parking_restrict_type?: string
  parking_restrict_time?: string
}
