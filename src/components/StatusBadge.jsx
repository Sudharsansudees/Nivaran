const LABELS = {
  filed: 'Filed',
  categorized: 'Categorized',
  in_progress: 'In Progress',
  awaiting_confirmation: 'Awaiting Confirmation',
  verified_closed: 'Verified & Closed',
  escalated: 'Escalated',
}

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`} aria-label={`Status: ${LABELS[status] ?? status}`}>{LABELS[status] ?? status}</span>
}

export { LABELS as STATUS_LABELS }
