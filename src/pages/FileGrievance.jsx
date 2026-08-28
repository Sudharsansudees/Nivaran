import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { aiClassify, createGrievance, transitionGrievance } from '../lib/api'
import { DEPARTMENTS } from '../lib/departments'

export default function FileGrievance() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState('')
  const [classification, setClassification] = useState(null)
  const [classifying, setClassifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleClassify() {
    if (!description.trim()) return
    setError(null)
    setClassifying(true)
    try {
      const result = await aiClassify(description)
      setClassification(result)
      setDepartment(result.department)
    } catch (e) {
      setError(e.message)
    } finally {
      setClassifying(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!department) {
      setError('Pick a department, or use "Suggest department" first.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const grievance = await createGrievance({
        citizenId: user.id,
        department,
        description,
      })

      // Move filed -> categorized. The guard requires a classification
      // result to exist; if the citizen never ran the AI suggestion (or
      // overrode it), we still record what was actually used.
      await transitionGrievance({
        grievanceId: grievance.id,
        event: 'AI_CLASSIFIED',
        payload: {
          classification: classification ?? {
            department,
            confidence: null,
            reason: 'Department selected manually by citizen.',
          },
        },
      })

      navigate(`/grievances/${grievance.id}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 className="sheet-title">File a Grievance</h2>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="description">Describe the issue</label>
          <textarea
            id="description"
            required
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setClassification(null)
            }}
            placeholder="e.g. Streetlight outside 12 MG Road has been out for two weeks…"
            autoFocus
          />
        </div>

        <button
          type="button"
          className="btn btn-outline btn-small"
          onClick={handleClassify}
          disabled={classifying || !description.trim()}
        >
          {classifying ? <span className="spinner" /> : 'Suggest department (AI)'}
        </button>

        {classification && (
          <div className="classification-box">
            Suggested: <strong>{classification.department}</strong>{' '}
            {classification.confidence != null && (
              <span className="conf">({Math.round(classification.confidence * 100)}% confidence)</span>
            )}
            <br />
            <span className="muted">{classification.reason}</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="department">Department</label>
          <select
            id="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="" disabled>
              Select a department…
            </option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="field-hint">You can override the AI suggestion before submitting.</div>
        </div>

        <div className="btn-row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Submit grievance'}
          </button>
        </div>
      </form>
    </div>
  )
}