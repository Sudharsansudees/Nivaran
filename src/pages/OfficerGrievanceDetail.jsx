import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGrievance, getStatusEvents, simulateSlaTimeout, transitionGrievance } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'

const DISPOSAL_TYPES = ['Resolved', 'Action taken', 'Referred to another agency', 'No action required']

export default function OfficerGrievanceDetail() {
  const { id } = useParams()

  const [grievance, setGrievance] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(false)

  const [disposalType, setDisposalType] = useState(DISPOSAL_TYPES[0])
  const [remark, setRemark] = useState('')
  const [reassignNote, setReassignNote] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [g, evs] = await Promise.all([getGrievance(id), getStatusEvents(id)])
      setGrievance(g)
      setEvents(evs)
    } catch (e) {
      setError(e.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function runTransition(event, payload) {
    setActing(true)
    setError(null)
    try {
      await transitionGrievance({ grievanceId: id, event, payload })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(false)
    }
  }

  if (error && !grievance) return <div className="banner banner-error">{error}</div>
  if (!grievance) {
    return (
      <div className="empty-state">
        <span className="spinner" /> Loading…
      </div>
    )
  }

  return (
    <div>
      <div className="sheet">
        <div className="grievance-card-top">
          <span className="grievance-card-id">#{grievance.id.slice(0, 8)} · {grievance.department}</span>
          <StatusBadge status={grievance.status} />
        </div>
        <p>{grievance.description}</p>
        {grievance.reopened_count > 0 && (
          <p className="muted">Reopened {grievance.reopened_count} time(s).</p>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {grievance.status === 'categorized' && (
        <div className="sheet">
          <h3 className="sheet-title">Pick up this grievance</h3>
          <div className="btn-row">
            <button className="btn" disabled={acting} onClick={() => runTransition('DEPT_PICKED_UP', {})}>
              Pick up
            </button>
          </div>
        </div>
      )}

      {grievance.status === 'in_progress' && (
        <div className="sheet">
          <h3 className="sheet-title">Resolve this grievance</h3>
          <div className="field">
            <label htmlFor="disposalType">Disposal type</label>
            <select id="disposalType" value={disposalType} onChange={(e) => setDisposalType(e.target.value)}>
              {DISPOSAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="remark">Remark</label>
            <textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="What was done to resolve this?"
            />
          </div>
          <div className="btn-row">
            <button
              className="btn"
              disabled={acting || !remark.trim()}
              onClick={() =>
                runTransition('DEPT_MARKED_DISPOSED', { disposalType, remark })
              }
            >
              Mark disposed
            </button>
            <button
              className="btn btn-outline"
              disabled={acting}
              onClick={() => runTransition('OFFICER_RETURNED_NOT_PERTAINING', {})}
            >
              Not pertaining to this department
            </button>
          </div>
        </div>
      )}

      {grievance.status === 'escalated' && (
        <div className="sheet">
          <h3 className="sheet-title">Reassign to a senior officer</h3>
          <div className="field">
            <label htmlFor="reassignNote">Note</label>
            <textarea
              id="reassignNote"
              value={reassignNote}
              onChange={(e) => setReassignNote(e.target.value)}
              placeholder="Context for the senior officer picking this up…"
            />
          </div>
          <div className="btn-row">
            <button
              className="btn"
              disabled={acting}
              onClick={() => runTransition('REASSIGNED_SENIOR', { note: reassignNote })}
            >
              Reassign
            </button>
          </div>
        </div>
      )}

      {grievance.status === 'awaiting_confirmation' && (
        <div className="sheet">
          <div className="banner banner-info" style={{ marginBottom: 0 }}>
            Marked disposed — waiting on the citizen to confirm or dispute.
          </div>
          <p className="field-hint" style={{ marginTop: '0.9rem' }}>
            In production this escalates automatically if the citizen doesn't respond within the
            SLA window (a daily scheduled check). For this demo, trigger that here:
          </p>
          <button
            className="btn btn-outline btn-small"
            disabled={acting}
            onClick={async () => {
              setActing(true)
              setError(null)
              try {
                await simulateSlaTimeout(id)
                await load()
              } catch (e) {
                setError(e.message)
              } finally {
                setActing(false)
              }
            }}
          >
            Simulate SLA timeout (demo)
          </button>
        </div>
      )}

      {grievance.status === 'verified_closed' && (
        <div className="seal">
          <span className="seal-icon">✓</span> Verified &amp; Closed
        </div>
      )}

      <div className="sheet">
        <h3 className="sheet-title">Audit trail</h3>
        <Timeline events={events} />
      </div>
    </div>
  )
}