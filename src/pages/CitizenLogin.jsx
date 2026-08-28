import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInAsCitizen } from '../lib/mockAuth'

export default function CitizenLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      signInAsCitizen(email)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout fade-up">
      <div className="auth-info">
        <div className="hero-eyebrow">Citizen Access</div>
        <h2>No password to lose, no form to fill out twice</h2>
        <ul className="auth-info-list">
          <li>
            <span className="dot" />
            <span>Enter your email and you're straight in — same "no password to remember"
            promise as OTP verification on other government services.</span>
          </li>
          <li>
            <span className="dot" />
            <span>First time here? Your account is created automatically — nothing to register in
            advance.</span>
          </li>
          <li>
            <span className="dot" />
            <span>Every grievance you file stays visible only to you and the department handling
            it.</span>
          </li>
        </ul>
      </div>

      <div className="sheet">
        <h2 className="sheet-title">Citizen Sign In</h2>

        {error && <div id="login-error" className="banner banner-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              aria-describedby={error ? 'login-error' : undefined}
              autoFocus
            />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? <><span className="spinner" aria-hidden="true" /> Signing in…</> : 'Continue'}
            </button>
          </div>
        </form>

        <p className="field-hint" style={{ marginTop: '1.25rem' }}>
          Here as an officer instead? <Link to="/officer/login">Sign in here</Link>.
        </p>
      </div>
    </div>
  )
}
