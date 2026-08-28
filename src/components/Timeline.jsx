import { STATUS_LABELS } from './StatusBadge'

const ACTOR_LABELS = {
  citizen: 'Citizen',
  officer: 'Officer',
  system: 'System',
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function Timeline({ events }) {
  if (!events?.length) {
    return <p className="muted">No events recorded yet.</p>
  }

  return (
    <ul className="timeline">
      {events.map((event) => (
        <li className="timeline-item" key={event.id}>
          <div className="timeline-state">{STATUS_LABELS[event.state] ?? event.state}</div>
          <div className="timeline-meta">
            {ACTOR_LABELS[event.actor] ?? event.actor} &middot; {formatTimestamp(event.created_at)}
          </div>
          {event.note && <div className="timeline-note">{event.note}</div>}
        </li>
      ))}
    </ul>
  )
}