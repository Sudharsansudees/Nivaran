import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  aiDraftEscalation,
  aiSummarize,
  getGrievance,
  getStatusEvents,
  transitionGrievance,
} from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'

export default function GrievanceDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [grievance, setGrievance] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [escalationDraft, setEscalationDraft] = useState(null)
  const [drafting, setDrafting] = useState(false)

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

  async function respond(confirmed) {
    setActing(true)
    setError(null)
    try {
      await transitionGrievance({
        grievanceId: id,
        event: confirmed ? 'CITIZEN_CONFIRMED_FIXED' : 'CITIZEN_SAID_NOT_FIXED',
        payload: {},
      })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(false)
    }
  }

  async function handleSummarize() {
    setSummarizing(true)
    setError(null)
    try {
      const result = await aiSummarize(events)
      setSummary(result.summary)
    } catch (e) {
      setError(e.message)
    } finally {
      setSummarizing(false)
    }
  }

  async function handleDraftEscalation() {
    setDrafting(true)
    setError(null)
    try {
      const result = await aiDraftEscalation({ description: grievance.description, statusEvents: events })
      setEscalationDraft(result.draft)
    } catch (e) {
      setError(e.message)
    } finally {
      setDrafting(false)
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

  const isOwner = grievance.citizen_id === user.id
  const canRespond = isOwner && grievance.status === 'awaiting_confirmation'

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

        {grievance.status === 'verified_closed' && (
          <div className="seal">
            <span className="seal-icon">✓</span> Verified &amp; Closed
          </div>
        )}
        {grievance.status === 'escalated' && (
          <div className="seal seal-alert">
            <span className="seal-icon">!</span> Escalated
          </div>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {canRespond && (
        <div className="sheet">
          <h3 className="sheet-title">The department marked this resolved</h3>
          <p className="muted">Has the issue actually been fixed?</p>
          <div className="btn-row">
            <button className="btn" disabled={acting} onClick={() => respond(true)}>
              Yes, it's fixed
            </button>
            <button className="btn btn-danger" disabled={acting} onClick={() => respond(false)}>
              No, not fixed
            </button>
          </div>
        </div>
      )}

      <div className="sheet">
        <h3 className="sheet-title">Plain-language summary</h3>
        {summary ? (
          <p>{summary}</p>
        ) : (
          <button className="btn btn-outline btn-small" onClick={handleSummarize} disabled={summarizing}>
            {summarizing ? <span className="spinner" /> : 'Summarize with AI'}
          </button>
        )}
      </div>

      {grievance.status === 'escalated' && (
        <div className="sheet">
          <h3 className="sheet-title">Escalation message</h3>
          {escalationDraft ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{escalationDraft}</p>
          ) : (
            <button className="btn btn-outline btn-small" onClick={handleDraftEscalation} disabled={drafting}>
              {drafting ? <span className="spinner" /> : 'Draft escalation message (AI)'}
            </button>
          )}
        </div>
      )}

      <div className="sheet">
        <h3 className="sheet-title">Audit trail</h3>
        <Timeline events={events} />
      </div>
    </div>
  )
}