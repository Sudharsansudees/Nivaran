import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>404</h2>
      <p>That page doesn't exist.</p>
      <Link to="/">Back home</Link>
    </div>
  )
}