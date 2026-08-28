import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChatWidget from './ChatWidget'
import { BrandIcon } from './Icons'

export default function Layout({ children }) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.focus()
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="utility-bar">
        Nivaran — Digital Grievance Redressal Platform · Prototype, not connected to CPGRAMS
      </div>
      <header className="app-header">
        <Link to={profile?.role === 'officer' ? '/officer' : '/'} className="brand" aria-label="Nivaran home">
          <span className="brand-emblem">
            <BrandIcon width={20} height={20} aria-hidden="true" />
          </span>
          <span className="brand-text">
            <span className="brand-name">Nivaran</span>
            <span className="brand-tag">Grievance Redressal</span>
          </span>
        </Link>
        {user && (
          <nav className="header-nav" aria-label="Account navigation">
            <span className="whoami">
              {profile?.role === 'officer' ? `${profile.department} · Officer` : user.email}
            </span>
            <button type="button" className="btn btn-outline btn-small" onClick={handleSignOut}>
              Sign out
            </button>
          </nav>
        )}
      </header>
      <main id="main-content" className="app-main" ref={mainRef} tabIndex="-1">{children}</main>
      <footer className="app-footer">
        Nivaran is a hackathon prototype for demonstration purposes. It is not affiliated with,
        connected to, or endorsed by CPGRAMS or any government system.
      </footer>
      <ChatWidget />
    </div>
  )
}
