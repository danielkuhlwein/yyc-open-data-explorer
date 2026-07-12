import type { SoqlParams } from '../../lib/soda'
import { escapeSoqlString } from '../../lib/soda'

export interface DevFilters {
  months: 3 | 6 | 12 | 24
  status: string // 'all' or exact statuscurrent value
  category: string // 'all' or exact category value
}

export const STATUS_OPTIONS: string[] = [
  'Released',
  'Cancelled',
  'Expired',
  'Lapsed',
  'Refused',
  'Pending Release',
  'In Advertising',
  'Hold',
]

export const CATEGORY_OPTIONS: string[] = [
  'Relaxation - Existing - Residential',
  'Residential - Secondary Suite',
  'Change of Use - Discretionary Use or Relaxations Required',
  'Home Occupation Class 2',
  'Residential - New Single / Semi / Duplex',
  'Change of Use - Permitted Use',
  'Signs - Permitted Use',
  'Relaxation - Existing - Compliance Follow-Up',
]

export function buildDevPermitParams(f: DevFilters, now: Date): SoqlParams {
  const since = new Date(now)
  since.setUTCMonth(since.getUTCMonth() - f.months)
  const clauses = [`applieddate > '${since.toISOString().slice(0, 10)}'`, 'point IS NOT NULL']
  if (f.status !== 'all') clauses.push(`statuscurrent = '${escapeSoqlString(f.status)}'`)
  if (f.category !== 'all') clauses.push(`category = '${escapeSoqlString(f.category)}'`)
  return {
    select:
      'permitnum,address,category,description,statuscurrent,applieddate,decision,decisiondate,communityname,point',
    where: clauses.join(' AND '),
    limit: 50000,
  }
}
