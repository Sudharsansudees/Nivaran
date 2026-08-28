import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ role, children }) {
  const { session, profile, loading } = useAuth()

  if (loading || session === undefined) {
    return (
      <div className="loading-state" role="status">
        <span className="spinner" aria-hidden="true" /> Checking your session…
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
