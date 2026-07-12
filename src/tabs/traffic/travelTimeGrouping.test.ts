import { describe, it, expect } from 'vitest'
import { groupByCorridor } from './travelTimeGrouping'
import type { TravelTimeRow } from '../../lib/datasets'

const rows: TravelTimeRow[] = [
  { corridor: 'Deerfoot Trail', road_segment: 'NB: A to B', travel_time_mins: '12', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Crowchild Trail', road_segment: 'SB: C to D', travel_time_mins: '8', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Deerfoot Trail', road_segment: 'SB: B to A', travel_time_mins: '14', last_update: '2026-07-11T13:03:55.000' },
]

describe('groupByCorridor', () => {
  it('groups rows by corridor, sorted alphabetically, segments in input order', () => {
    const groups = groupByCorridor(rows)
    expect(groups.map((g) => g.corridor)).toEqual(['Crowchild Trail', 'Deerfoot Trail'])
    expect(groups[1].segments).toHaveLength(2)
    expect(groups[1].segments[0].travel_time_mins).toBe('12')
  })
})
