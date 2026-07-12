import type { TravelTimeRow } from '../../lib/datasets'

export interface CorridorGroup {
  corridor: string
  segments: TravelTimeRow[]
}

export function groupByCorridor(rows: TravelTimeRow[]): CorridorGroup[] {
  const map = new Map<string, TravelTimeRow[]>()
  for (const row of rows) {
    const list = map.get(row.corridor) ?? []
    list.push(row)
    map.set(row.corridor, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([corridor, segments]) => ({ corridor, segments }))
}
