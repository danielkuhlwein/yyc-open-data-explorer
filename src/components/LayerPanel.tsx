import type { ReactNode } from 'react'

export interface LayerItem {
  key: string
  label: string
  checked: boolean
  onChange: () => void
  status?: ReactNode
}

export default function LayerPanel({ items, children }: { items: LayerItem[]; children?: ReactNode }) {
  return (
    <div className="pointer-events-auto w-72 space-y-2 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
        Layers
      </h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.checked} onChange={item.onChange} />
              {item.label}
            </label>
            {item.status}
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}
