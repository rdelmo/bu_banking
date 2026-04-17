import { useNavigate } from 'react-router-dom'
import { logout } from '../api'

/**
 * Navbar — shown on every protected page.
 * Displays the JPMorgan branding, the logged-in user's name,
 * and a Sign Out button.
 *
 * Props:
 *   user — the user object returned by getCurrentUser() (can be null while loading)
 */
export default function Navbar({ user }) {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav
      style={{
        background: '#fff',
        height: '64px',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(107,76,30,0.12)',
        borderBottom: '1px solid var(--jp-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ── Left: brand ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Brown vertical accent */}
        <div
          style={{
            width: '5px',
            height: '36px',
            background: 'var(--jp-brown)',
            borderRadius: '3px',
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              color: 'var(--jp-text-light)',
              fontSize: '10px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            Banking
          </div>
          <div
            style={{
              color: 'var(--jp-brown)',
              fontWeight: '700',
              fontSize: '16px',
              letterSpacing: '-0.3px',
            }}
          >
            JPMorgan Chase
          </div>
        </div>
      </div>

      {/* ── Right: nav links + user + sign-out ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <a
          href="/dashboard"
          style={{
            color: 'var(--jp-brown)',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
            padding: '4px 2px',
            borderBottom: '2px solid transparent',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--jp-brown-hover)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--jp-brown)')}
        >
          Home
        </a>
        <a
          href="/subscriptions"
          style={{
            color: 'var(--jp-brown)',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
            padding: '4px 2px',
            borderBottom: '2px solid transparent',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--jp-brown-hover)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--jp-brown)')}
        >
          Subscriptions
        </a>
        {user && (
          <span style={{ color: 'var(--jp-text-light)', fontSize: '14px' }}>
            {user.first_name || user.username}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1.5px solid var(--jp-brown)',
            color: 'var(--jp-brown)',
            padding: '6px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'inherit',
            transition: 'border-color 0.18s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--jp-brown-hover)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--jp-brown)')}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
