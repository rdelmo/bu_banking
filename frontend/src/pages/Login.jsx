import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

/**
 * Login page
 * Shown to every unauthenticated visitor.
 * On success the JWT tokens are saved in localStorage by api.js,
 * then the user is redirected to /dashboard.
 */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid username or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* ── Brand header ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        {/* Gold accent bar */}
        <div
          style={{
            width: '48px',
            height: '4px',
            background: 'var(--jp-brown)',
            borderRadius: '2px',
            margin: '0 auto 16px',
          }}
        />
        <p
          style={{
            color: 'var(--jp-text-light)',
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Online Banking
        </p>
        <h1
          style={{
            color: 'var(--jp-brown)',
            fontSize: '30px',
            fontWeight: '700',
            letterSpacing: '-0.5px',
          }}
        >
          JPMorgan Chase
        </h1>
      </div>

      {/* ── Login card ──────────────────────────────────────────────── */}
      <div
        className="card"
        style={{ width: '100%', maxWidth: '400px', padding: '36px 32px' }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
          Sign in
        </h2>
        <p style={{ color: 'var(--jp-text-light)', fontSize: '14px', marginBottom: '28px' }}>
          Enter your credentials to access your accounts
        </p>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="username"
              style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}
            >
              Username
            </label>
            <input
              id="username"
              className="input-field"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '28px' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}
            >
              Password
            </label>
            <input
              id="password"
              className="input-field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                background: '#FFF0EF',
                border: '1px solid #F5C6C2',
                color: 'var(--jp-danger)',
                borderRadius: 'var(--jp-radius)',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <p
        style={{
          marginTop: '28px',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        © 2026 JPMorgan Chase &amp; Co. All rights reserved.
      </p>
    </div>
  )
}
