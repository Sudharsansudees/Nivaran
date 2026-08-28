import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BuildingIcon, CheckCircleIcon, CitizenIcon, FileIcon, OfficerIcon, SparkleIcon } from '../components/Icons'

const STEPS = [
  { title: 'File', desc: 'Describe the issue in your own words — no forms, no jargon.', Icon: FileIcon },
  { title: 'AI Classifies', desc: 'The right department is identified automatically.', Icon: SparkleIcon },
  { title: 'Department Acts', desc: 'An officer picks it up and resolves it.', Icon: BuildingIcon },
  { title: 'You Confirm', desc: 'You have the final word on whether it’s actually fixed.', Icon: CheckCircleIcon },
]

export default function Landing() {
  const { session, profile, loading } = useAuth()

  // Already signed in? Skip the marketing page and go straight in.
  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'officer' ? '/officer' : '/dashboard'} replace />
  }

  return (
    <div>
      <div className="hero fade-up">
        <div className="hero-eyebrow">Digital Grievance Redressal</div>
        <h1>File a grievance. Watch it move. Have the final say.</h1>
        <p className="hero-sub">
          Nivaran replaces the black box of a complaint dropped into a government inbox with a
          transparent, auditable process — every step is timestamped, and nothing is marked
          resolved without your confirmation.
        </p>
      </div>

      <div className="role-toggle fade-up" style={{ animationDelay: '0.08s' }}>
        <Link to="/login">
          <span className="role-icon">
            <CitizenIcon />
          </span>
          <span className="role-title">I'm a Citizen</span>
          <span className="role-desc">
            File a new grievance or track one you've already filed — sign in with just your
            email, no password to remember.
          </span>
        </Link>
        <Link to="/officer/login">
          <span className="role-icon">
            <OfficerIcon />
          </span>
          <span className="role-title">I'm an Officer</span>
          <span className="role-desc">
            Review and act on grievances assigned to your department's queue.
          </span>
        </Link>
      </div>

      <div className="sheet fade-up" style={{ animationDelay: '0.16s' }}>
        <h3 className="sheet-title">How it works</h3>
        <div className="steps">
          {STEPS.map(({ title, desc, Icon }) => (
            <div className="step" key={title}>
              <div className="step-number">
                <Icon width={18} height={18} />
              </div>
              <div className="step-title">{title}</div>
              <div className="step-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="disclaimer">
        Nivaran is an independent hackathon prototype. It is not affiliated with, connected to,
        or endorsed by CPGRAMS or any government system — every grievance you see here lives only
        in this demo's own database.
      </div>
    </div>
  )
}
