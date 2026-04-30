import { useNavigate, useLocation } from 'react-router-dom'
import { logout } from '../api'

/**
 * Navbar — two-row design.
 * Row 1: brand left | Bank Overview toggle (admin) + Sign Out right
 * Row 2: nav links
 *
 * Props:
 *   user — the user object returned by getCurrentUser() (can be null while loading)
 */
export default function Navbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const primaryAccountId = localStorage.getItem('primary_account_id')
  const isBankOverview = location.pathname === '/bank-overview'

  const isActive = (href) => {
    if (!href) return false
    if (href === '/bank-overview') {
      return location.pathname === '/bank-overview' && !location.search.includes('tab=terminal')
    }
    if (href === '/bank-overview?tab=terminal') {
      return location.pathname === '/bank-overview' && location.search.includes('tab=terminal')
    }
    return location.pathname === href
  }

  const defaultLinks = [
    { label: 'Home',             href: '/dashboard' },
    { label: 'Pay & Transfer',   href: primaryAccountId ? `/transactions/${primaryAccountId}` : '/dashboard' },
    { label: 'Subscriptions',    href: '/subscriptions' },
    { label: 'Cards',            href: null },
    { label: 'Offers',           href: null },
    { label: 'Help',             href: null },
  ]

  const bankAdminLinks = [
    { label: 'Bank View',            href: '/bank-overview' },
    { label: 'NFC Payment Terminal', href: '/bank-overview?tab=terminal' },
  ]

  const navLinks = isBankOverview ? bankAdminLinks : defaultLinks

  const linkStyle = (href) => ({
    color: isActive(href) ? 'var(--jp-brown)' : 'var(--jp-text-light)',
    fontSize: '13px',
    fontWeight: isActive(href) ? '700' : '500',
    textDecoration: 'none',
    padding: '6px 2px',
    borderBottom: isActive(href) ? '2px solid var(--jp-brown)' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  return (
    <nav
      style={{
        background: '#fff',
        boxShadow: '0 2px 10px rgba(107,76,30,0.12)',
        borderBottom: '1px solid var(--jp-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ── Row 1: brand + actions ──────────────────────────────────── */}
      <div
        style={{
          padding: '0 28px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--jp-border)',
        }}
      >
        {/* Brand */}
        <a
          href="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
        >
          <div
            style={{
              width: '5px',
              height: '32px',
              background: 'var(--jp-brown)',
              borderRadius: '3px',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                color: 'var(--jp-text-light)',
                fontSize: '9px',
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
                fontSize: '15px',
                letterSpacing: '-0.3px',
              }}
            >
              Lion Kings
            </div>
          </div>
        </a>

        {/* Right: Bank View / Personal Bank toggle + Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user?.is_staff && (
            <a
              href={isBankOverview ? '/dashboard' : '/bank-overview'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--jp-brown-light)',
                color: 'var(--jp-brown)',
                border: '1.5px solid var(--jp-brown)',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span>{isBankOverview ? '👤' : '🏛'}</span>
              {isBankOverview ? 'Personal Bank' : 'Bank View'}
            </a>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1.5px solid var(--jp-brown)',
              color: 'var(--jp-brown)',
              padding: '5px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
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
      </div>

      {/* ── Row 2: nav links ────────────────────────────────────────── */}
      <div
        style={{
          padding: '0 28px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        {navLinks.map(({ label, href }) =>
          href ? (
            <a
              key={label}
              href={href}
              style={linkStyle(href)}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--jp-brown)' }}
              onMouseOut={e => { e.currentTarget.style.color = isActive(href) ? 'var(--jp-brown)' : 'var(--jp-text-light)' }}
            >
              {label}
            </a>
          ) : (
            <span
              key={label}
              onClick={() => alert(`${label} — coming soon`)}
              style={linkStyle(null)}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--jp-brown)' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--jp-text-light)' }}
            >
              {label}
            </span>
          )
        )}
      </div>
    </nav>
  )
}
