export function NoticePopup({ props }: { props: Record<string, string> }) {
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">{props.description || 'Development notice'}</p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">Status: {props.status}</p>
      {props.adStart && (
        <p className="text-xs text-stone-500">
          Notice period {props.adStart.slice(0, 10)} → {props.adEnd.slice(0, 10)}
        </p>
      )}
      <p className="text-[11px] text-stone-400">{props.file}</p>
    </div>
  )
}

export function DevPermitPopup({ props }: { props: Record<string, string> }) {
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">{props.description || props.permitnum}</p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">{props.category} — {props.status}</p>
      <p className="text-xs text-stone-500">
        Applied {props.applied.slice(0, 10)}
        {props.decision && ` · ${props.decision} ${props.decisionDate.slice(0, 10)}`}
      </p>
      <p className="text-[11px] text-stone-400">{props.permitnum}</p>
    </div>
  )
}

export function BuildingPermitPopup({ props }: { props: Record<string, string> }) {
  const cost = Number(props.cost)
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">
        {cost > 0 ? `$${cost.toLocaleString()}` : 'Building permit'}
      </p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">{props.status} · applied {props.applied.slice(0, 10)}</p>
      {props.units && Number(props.units) > 0 && <p className="text-xs">{props.units} housing units</p>}
      {props.contractor && <p className="text-xs text-stone-500">{props.contractor}</p>}
      <p className="text-[11px] text-stone-400">{props.permitnum}</p>
    </div>
  )
}
