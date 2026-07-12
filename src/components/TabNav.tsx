import { NavLink } from 'react-router'

const tabs = [
  { to: '/traffic', label: 'Traffic' },
  { to: '/parking', label: 'Parking' },
  { to: '/development', label: 'Development' },
]

export default function TabNav() {
  return (
    <nav className="flex gap-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-stone-600 hover:bg-stone-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
