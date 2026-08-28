import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyGrievances } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

export default function CitizenDashboard() {
  const [grievances, setGrievances] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listMyGrievances().then(setGrievances).catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <div className="grievance-card-top" style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0 }}>Your Grievances</h1>
        <Link to="/file" className="btn">
          File a new grievance
        </Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {grievances === null && !error && (
        <div className="empty-state">
          <span className="spinner" /> Loading…
        </div>
      )}

      {grievances?.length === 0 && (
        <div className="empty-state">
          You haven't filed any grievances yet.
          <br />
          <Link to="/file">File your first one</Link>.
        </div>
      )}

      <div className="card-list">
        {grievances?.map((g) => (
          <Link to={`/grievances/${g.id}`} className="grievance-card" key={g.id}>
            <div className="grievance-card-top">
              <span className="grievance-card-id">
                #{g.id.slice(0, 8)} · {g.department}
              </span>
              <StatusBadge status={g.status} />
            </div>
            <div className="grievance-card-desc">{g.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}