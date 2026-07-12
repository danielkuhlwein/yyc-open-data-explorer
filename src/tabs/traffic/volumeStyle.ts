import type { ExpressionSpecification } from 'maplibre-gl'
import { VOLUME_DATASETS } from '../../lib/datasets'

export const VOLUME_YEARS = Object.entries(VOLUME_DATASETS)
  .filter(([, id]) => id != null)
  .map(([year, id]) => ({ year: Number(year), id: id as string }))
  .sort((a, b) => b.year - a.year)

const VOL: ExpressionSpecification = ['to-number', ['get', 'volume']]

// Fixed domain across years so year-over-year comparison is honest.
export function volumeLineColor(dark: boolean): ExpressionSpecification {
  return [
    'interpolate', ['linear'], VOL,
    0, dark ? '#184f95' : '#cde2fb',
    5000, dark ? '#1c5cab' : '#9ec5f4',
    20000, dark ? '#3987e5' : '#5598e7',
    50000, dark ? '#6da7ec' : '#2a78d6',
    100000, dark ? '#9ec5f4' : '#1c5cab',
    200000, dark ? '#cde2fb' : '#0d366b',
  ]
}

export function volumeLineWidth(): ExpressionSpecification {
  return ['interpolate', ['linear'], VOL, 0, 0.5, 20000, 2, 100000, 4.5, 200000, 7]
}
