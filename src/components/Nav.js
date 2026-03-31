import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Nav() {
  const { signOut } = useAuth()
  const location = useLocation()
  const isBuilder = location.pathname.startsWith('/trip/')

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        <div className="nav-pin" />
        Pinpoint
      </Link>

      <div className="nav-tabs">
        <Link to="/" className={`nav-tab ${!isBuilder ? 'active' : ''}`}>
          My Trips
        </Link>
        {isBuilder && (
          <span className="nav-tab active">Trip Builder</span>
        )}
      </div>

      <div className="nav-right">
        <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
