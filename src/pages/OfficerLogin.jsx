import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInAsOfficer } from '../lib/mockAuth'

const DEMO_ACCOUNTS = [
  { email: 'roads.officer@nivaran.test', label: 'Roads & Infrastructure' },
  { email: 'water.officer@nivaran.test', label: 'Water Supply' },
  { email: 'electricity.officer@nivaran.test', label: 'Electricity' },
  { email: 'sanitation.officer@nivaran.test', label: 'Sanitation & Waste' },
  { email: 'health.officer@nivaran.test', label: 'Public Health' },
  { email: 'education.officer@nivaran.test', label: 'Education' },
  { email: 'police.officer@nivaran.test', label: 'Police & Public Safety' },
  { email: 'other.officer@nivaran.test', label: 'Other' },
]
const DEMO_PASSWORD = 'Nivaran#Demo1'

export default function OfficerLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function attempt(loginEmail, loginPassword) {
    setError(null)
    setBusy(true)
    try {
      signInAsOfficer(loginEmail, loginPassword)
      navigate('/officer')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    attempt(email, password)
  }

  return (
    <div className="auth-layout fade-up">
      <div className="auth-info">
        <div className="hero-eyebrow">Officer Access</div>
        <h2>Your department's queue, nothing else</h2>
        <ul className="auth-info-list">
          <li>
            <span className="dot" />
            <span>You only ever see grievances filed under your own department.</span>
          </li>
          <li>
            <span className="dot" />
            <span>Every action you take — pickup, disposal, reassignment — is written to a
            permanent audit trail.</span>
          </li>
          <li>
            <span className="dot" />
            <span>Marking something resolved doesn't close it — the citizen has the final
            confirmation.</span>
          </li>
        </ul>

        <div className="classification-box" style={{ marginTop: '1.5rem' }}>
          <strong>Try it instantly</strong> — demo accounts, password <code>{DEMO_PASSWORD}</code>:
          <div className="btn-row" style={{ marginTop: '0.6rem' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="btn btn-outline btn-small"
                disabled={busy}
                onClick={() => attempt(acc.email, DEMO_PASSWORD)}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sheet">
        <h2 className="sheet-title">Officer Sign In</h2>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="field-hint" style={{ marginTop: '1.25rem' }}>
          New officer? <Link to="/officer/signup">Create an account</Link>.
          <br />
          Here as a citizen instead? <Link to="/login">Sign in here</Link>.
        </p>
      </div>
    </div>
  )
}
