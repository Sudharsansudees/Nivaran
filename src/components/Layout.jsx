import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChatWidget from './ChatWidget'
import { BrandIcon } from './Icons'

export default function Layout({ children }) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <div className="utility-bar">
        Nivaran — Digital Grievance Redressal Platform · Prototype, not connected to CPGRAMS
      </div>
      <header className="app-header">
        <Link to={profile?.role === 'officer' ? '/officer' : '/'} className="brand">
          <span className="brand-emblem">
            <BrandIcon width={20} height={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Nivaran</span>
            <span className="brand-tag">Grievance Redressal</span>
          </span>
        </Link>
        {user && (
          <nav className="header-nav">
            <span className="whoami">
              {profile?.role === 'officer' ? `${profile.department} · Officer` : user.email}
            </span>
            <button className="btn btn-outline btn-small" onClick={handleSignOut}>
              Sign out
            </button>
          </nav>
        )}
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        Nivaran is a hackathon prototype for demonstration purposes. It is not affiliated with,
        connected to, or endorsed by CPGRAMS or any government system.
      </footer>
      <ChatWidget />
    </div>
  )
}
