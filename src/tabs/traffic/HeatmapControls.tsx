import type { HeatmapFilters } from './heatmapFilters'

interface Props {
  filters: HeatmapFilters
  onChange: (f: HeatmapFilters) => void
}

export default function HeatmapControls({ filters, onChange }: Props) {
  return (
    <div className="space-y-2 border-t border-stone-200 pt-2 text-sm dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500 dark:text-zinc-400">Range</span>
        {(['30d', '1y', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...filters, preset: p })}
            className={`rounded px-2 py-0.5 text-xs ${
              filters.preset === p
                ? 'bg-blue-600 text-white'
                : 'bg-stone-100 dark:bg-zinc-800'
            }`}
          >
            {p === '30d' ? '30 days' : p === '1y' ? '1 year' : 'All time'}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs">
        Hours {String(filters.hourFrom).padStart(2, '0')}–{String(filters.hourTo).padStart(2, '0')}
        <input
          type="range"
          min={0}
          max={23}
          value={filters.hourFrom}
          onChange={(e) =>
            onChange({ ...filters, hourFrom: Math.min(Number(e.target.value), filters.hourTo) })
          }
        />
        <input
          type="range"
          min={0}
          max={23}
          value={filters.hourTo}
          onChange={(e) =>
            onChange({ ...filters, hourTo: Math.max(Number(e.target.value), filters.hourFrom) })
          }
        />
      </label>
      <div className="flex gap-1">
        {(['all', 'weekday', 'weekend'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange({ ...filters, days: d })}
            className={`rounded px-2 py-0.5 text-xs capitalize ${
              filters.days === d ? 'bg-blue-600 text-white' : 'bg-stone-100 dark:bg-zinc-800'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
