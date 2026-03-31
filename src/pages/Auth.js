import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)
    if (error) toast.error(error.message)
    else if (mode === 'signup') toast.success('Check your email to confirm your account!')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--sand)', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--accent)',
            borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
            margin: '0 auto 16px', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 16, height: 16, background: 'white',
              borderRadius: '50%', transform: 'translate(-50%,-50%)',
            }} />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28 }}>Pinpoint</div>
          <div style={{ color: 'var(--ink-light)', fontSize: 13, marginTop: 4 }}>
            {mode === 'signin' ? 'Welcome back' : 'Plan your next adventure'}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', padding: '28px',
        }}>
          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="label">Email</label>
              <input
                className="input" type="email" required
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                className="input" type="password" required
                placeholder="••••••••" minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading
                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white' }} />
                : mode === 'signin' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-light)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500 }}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
