import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDepartmentGrievances } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge, { STATUS_LABELS } from '../components/StatusBadge'

const TABS = ['all', 'categorized', 'in_progress', 'awaiting_confirmation', 'escalated', 'verified_closed']

export default function OfficerDashboard() {
  const { profile } = useAuth()
  const [grievances, setGrievances] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    listDepartmentGrievances().then(setGrievances).catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!grievances) return []
    if (tab === 'all') return grievances
    return grievances.filter((g) => g.status === tab)
  }, [grievances, tab])

  return (
    <div>
      <h1>{profile?.department} Queue</h1>
      <p className="muted">Grievances visible to this department only, enforced by row-level security.</p>

      <div className="btn-row" style={{ marginBottom: '1.5rem' }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`btn btn-small ${tab === t ? '' : 'btn-outline'}`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? 'All' : STATUS_LABELS[t]}
          </button>
        ))}
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {grievances === null && !error && (
        <div className="empty-state">
          <span className="spinner" /> Loading…
        </div>
      )}
      {filtered.length === 0 && grievances !== null && (
        <div className="empty-state">Nothing here.</div>
      )}

      <div className="card-list">
        {filtered.map((g) => (
          <Link to={`/officer/grievances/${g.id}`} className="grievance-card" key={g.id}>
            <div className="grievance-card-top">
              <span className="grievance-card-id">#{g.id.slice(0, 8)}</span>
              <StatusBadge status={g.status} />
            </div>
            <div className="grievance-card-desc">{g.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}