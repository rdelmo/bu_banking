import { useNavigate } from 'react-router-dom'

/**
 * Visual styles per account type.
 * Each entry has a CSS gradient and a human-readable label.
 */
const STYLES = {
  current: {
    gradient: 'linear-gradient(135deg, #6B4C1E 0%, #C8922A 100%)',
    label: 'Current Account',
    icon: '🏦',
  },
  savings: {
    gradient: 'linear-gradient(135deg, #1A5C38 0%, #2D7D46 100%)',
    label: 'Savings Account',
    icon: '💰',
  },
  credit: {
    gradient: 'linear-gradient(135deg, #7B2D2D 0%, #A93226 100%)',
    label: 'Credit Account',
    icon: '💳',
  },
  other: {
    gradient: 'linear-gradient(135deg, #3D3D3D 0%, #5A5A5A 100%)',
    label: 'Account',
    icon: '📋',
  },
}

/**
 * AccountCard
 * Clickable card showing account name, type, and balance.
 * Navigates to the Transactions page for that account on click.
 *
 * Props:
 *   account — a single Account object from the API
 */
export default function AccountCard({ account }) {
  const navigate = useNavigate()
  const style = STYLES[account.account_type] || STYLES.other

  // Prefer live current_balance; fall back to starting_balance for display
  const balance = parseFloat(account.current_balance ?? account.starting_balance ?? 0).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/transactions/${account.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/transactions/${account.id}`)}
      style={{
        background: style.gradient,
        borderRadius: '14px',
        padding: '26px 24px',
        color: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 4px 16px rgba(0, 48, 135, 0.2)',
        minHeight: '170px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 48, 135, 0.28)'
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 48, 135, 0.2)'
      }}
    >
      {/* Decorative background circle */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row: account type label */}
      <div>
        <div
          style={{
            fontSize: '11px',
            opacity: 0.7,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          {style.label}
        </div>
      </div>

      {/* Bottom row: balance + optional round-up badge */}
      <div>
        <div style={{ fontSize: '12px', opacity: 0.65, marginBottom: '4px' }}>
          Available Balance
        </div>
        <div style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-1px' }}>
          {balance}
        </div>


      </div>
    </div>
  )
}
