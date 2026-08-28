import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpOfficer } from '../lib/mockAuth'
import { DEPARTMENTS } from '../lib/departments'

export default function OfficerSignup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!department) {
      setError('Pick a department.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      signUpOfficer({ email, password, name, department })
      navigate('/officer')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="sheet" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2 className="sheet-title">Create an Officer Account</h2>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="department">Department</label>
          <select id="department" required value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="" disabled>
              Select a department…
            </option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Create account'}
          </button>
        </div>
      </form>

      <p className="field-hint" style={{ marginTop: '1.25rem' }}>
        Already have an account? <Link to="/officer/login">Sign in</Link>.
      </p>
    </div>
  )
}
