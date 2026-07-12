import { parseRateSchedule, sanitizeRateHtml } from '../../lib/rateSchedule'
import type { ParkingZoneProps } from '../../lib/datasets'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

function dayRange(days: number[]): string {
  if (days.length === 7) return 'Daily'
  if (days.length === 1) return DAY_LABELS[days[0]]
  return `${DAY_LABELS[days[0]]}–${DAY_LABELS[days[days.length - 1]]}`
}

export default function ParkingPopup({ props }: { props: ParkingZoneProps }) {
  const schedule = parseRateSchedule(props.html_zone_rate)
  return (
    <div className="max-w-80 space-y-2 text-stone-900">
      <p className="text-sm font-medium">{props.address_desc ?? 'Parking zone'}</p>
      {schedule.windows.length > 0 ? (
        <table className="w-full text-xs">
          <tbody>
            {schedule.windows.map((w, i) => (
              <tr key={i}>
                <td>{dayRange(w.days)}</td>
                <td>{w.startMin === 0 && w.endMin === 1440 ? 'All day' : `${fmt(w.startMin)}–${fmt(w.endMin)}`}</td>
                <td className="text-right font-medium">
                  {w.kind === 'paid' ? `$${w.ratePerHour.toFixed(2)}/hr` : w.kind === 'free' ? 'Free' : 'No parking'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : props.html_zone_rate ? (
        <div
          className="text-xs"
          dangerouslySetInnerHTML={{ __html: sanitizeRateHtml(props.html_zone_rate) }}
        />
      ) : (
        <p className="text-xs text-stone-500">No rate information.</p>
      )}
      {schedule.notes.length > 0 && (
        <ul className="list-disc pl-4 text-[11px] text-stone-500">
          {schedule.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-2 text-[11px] text-stone-600">
        {props.max_time && (<><dt>Max stay</dt><dd>{props.max_time} min</dd></>)}
        {props.enforceable_time && (<><dt>Enforced</dt><dd>{props.enforceable_time}</dd></>)}
        {props.stall_type && (<><dt>Stall type</dt><dd>{props.stall_type}</dd></>)}
        {props.permit_zone && (<><dt>Zone</dt><dd>{props.permit_zone}</dd></>)}
      </dl>
    </div>
  )
}
