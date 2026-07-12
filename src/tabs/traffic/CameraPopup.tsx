import { useState } from 'react'

export default function CameraPopup({ url, location }: { url: string; location: string }) {
  const [ts, setTs] = useState(() => Date.now())
  return (
    <div className="w-80 space-y-2 text-stone-900">
      <p className="text-sm font-medium">{location}</p>
      <img src={`${url}?ts=${ts}`} alt={`Traffic camera at ${location}`} className="w-full rounded" />
      <button
        type="button"
        onClick={() => setTs(Date.now())}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
      >
        Refresh image
      </button>
    </div>
  )
}
