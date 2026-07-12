export interface TimeSelection {
  day: number // 0=Sun..6=Sat
  minutes: number // 0..1439
}

export function nowSelection(): TimeSelection {
  const d = new Date()
  return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  value: TimeSelection
  onChange: (v: TimeSelection) => void
}

export default function TimeSelector({ value, onChange }: Props) {
  const hh = String(Math.floor(value.minutes / 60)).padStart(2, '0')
  const mm = String(value.minutes % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
      <select
        value={value.day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
      >
        {DAY_NAMES.map((d, i) => (
          <option key={d} value={i}>{d}</option>
        ))}
      </select>
      <input
        type="time"
        value={`${hh}:${mm}`}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number)
          onChange({ ...value, minutes: h * 60 + m })
        }}
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
      />
      <button
        type="button"
        onClick={() => onChange(nowSelection())}
        className="rounded bg-blue-600 px-2 py-0.5 font-medium text-white"
      >
        Now
      </button>
    </div>
  )
}
