import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import TabNav from './components/TabNav'

const TrafficTab = lazy(() => import('./tabs/traffic/TrafficTab'))
const ParkingTab = lazy(() => import('./tabs/parking/ParkingTab'))
const DevelopmentTab = lazy(() => import('./tabs/development/DevelopmentTab'))

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-base font-semibold">YYC Open Data Explorer</h1>
        <TabNav />
      </header>
      <main className="relative min-h-0 flex-1">
        <Suspense fallback={<p className="p-4 text-sm text-stone-500">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/traffic" replace />} />
            <Route path="/traffic" element={<TrafficTab />} />
            <Route path="/parking" element={<ParkingTab />} />
            <Route path="/development" element={<DevelopmentTab />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
