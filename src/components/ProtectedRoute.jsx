import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ role, children }) {
  const { session, profile, loading } = useAuth()

  if (loading || session === undefined) {
    return (
      <div className="empty-state">
        <span className="spinner" /> Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to={role === 'officer' ? '/officer/login' : '/login'} replace />
  }

  if (role && profile?.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}