import type { SoqlParams } from '../../lib/soda'

export interface HeatmapFilters {
  preset: '30d' | '1y' | 'all'
  hourFrom: number
  hourTo: number
  days: 'all' | 'weekday' | 'weekend'
}

const PRESET_MS: Record<'30d' | '1y', number> = {
  '30d': 30 * 24 * 3600 * 1000,
  '1y': 365 * 24 * 3600 * 1000,
}

export function compileHeatmapParams(f: HeatmapFilters, now: Date): SoqlParams {
  const clauses: string[] = []
  if (f.preset !== 'all') {
    const since = new Date(now.getTime() - PRESET_MS[f.preset])
    clauses.push(`start_dt > '${since.toISOString().slice(0, 19)}'`)
  }
  if (f.hourFrom > 0 || f.hourTo < 23) {
    clauses.push(`date_extract_hh(start_dt) between ${f.hourFrom} and ${f.hourTo}`)
  }
  if (f.days === 'weekday') clauses.push('date_extract_dow(start_dt) between 1 and 5')
  if (f.days === 'weekend') clauses.push('date_extract_dow(start_dt) in (0, 6)')

  return {
    select: 'latitude,longitude',
    where: clauses.join(' AND ') || undefined,
    limit: 200000,
  }
}
