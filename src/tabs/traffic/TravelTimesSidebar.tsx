import type { TravelTimeRow } from '../../lib/datasets'
import { groupByCorridor } from './travelTimeGrouping'

interface Props {
  rows: TravelTimeRow[]
  updatedAt?: number
}

export default function TravelTimesSidebar({ rows, updatedAt }: Props) {
  const groups = groupByCorridor(rows)
  return (
    <div className="pointer-events-auto max-h-[60vh] w-72 space-y-2 overflow-y-auto rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
          Travel times
        </h2>
        {updatedAt ? (
          <span className="text-[10px] text-stone-400">
            {new Date(updatedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      {groups.map((g) => (
        <div key={g.corridor}>
          <h3 className="text-xs font-semibold">{g.corridor}</h3>
          <ul>
            {g.segments.map((s) => (
              <li key={s.road_segment} className="flex justify-between gap-2 text-xs leading-5">
                <span className="truncate">{s.road_segment}</span>
                <span className="font-medium tabular-nums">{s.travel_time_mins} min</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
