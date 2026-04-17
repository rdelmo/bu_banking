import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AccountCard from '../components/AccountCard'
import { getCurrentUser, getRecentTransactions } from '../api'

/**
 * Dashboard page
 * The home screen after login.
 * Shows a greeting, total balance across all accounts,
 * and a card for each account.
 *
 * Note: we call getCurrentUser() which returns { user, accounts }
 * in one request — no need for a separate accounts call.
 */
export default function Dashboard() {
  const [user, setUser]         = useState(null)
  const [accounts, setAccounts]  = useState([])
  const [recent, setRecent]      = useState([])
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const [data, recentTxns] = await Promise.all([
          getCurrentUser(),
          getRecentTransactions(),
        ])
        setUser(data.user)
        setAccounts(data.accounts)
        setRecent(recentTxns)
      } catch (err) {
        // If the token is invalid / expired, send the user back to login
        if (err.message.includes('401') || err.message.includes('403')) {
          navigate('/login')
        } else {
          setError('Unable to load your account data. Please refresh the page.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [navigate])

  // Sum live current_balance across all accounts
  const totalBalance = accounts.reduce(
    (sum, a) => sum + parseFloat(a.current_balance ?? a.starting_balance ?? 0),
    0
  )

  const formattedTotal = totalBalance.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })

  const greeting = user
    ? `Welcome back, ${user.first_name || user.username}`
    : 'Welcome back'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--jp-bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px' }}>

        {/* ── Greeting banner ───────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6B4C1E 0%, #C8922A 100%)',
            borderRadius: '14px',
            padding: '28px 32px',
            color: '#fff',
            marginBottom: '36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
              {greeting}
            </h2>
            <p style={{ opacity: 0.7, fontSize: '14px' }}>
              Here is a summary of your accounts
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Balance
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-1px' }}>
              {loading ? '—' : formattedTotal}
            </div>
          </div>
        </div>

        {/* ── Error state ───────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              background: '#FFF0EF',
              border: '1px solid #F5C6C2',
              color: 'var(--jp-danger)',
              borderRadius: 'var(--jp-radius)',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* ── Loading state ─────────────────────────────────────────── */}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--jp-text-light)',
              padding: '60px 0',
              fontSize: '15px',
            }}
          >
            Loading your accounts…
          </div>
        )}

        {/* ── Account cards grid ────────────────────────────────────── */}
        {!loading && accounts.length > 0 && (
          <>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--jp-text-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '16px',
              }}
            >
              Your Accounts
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '20px',
                marginBottom: '36px',
              }}
            >
              {accounts.map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>

            {/* Hint */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: '32px' }}>
              <p style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>
                Click any account card to view its full transaction history and spending breakdown.
              </p>
            </div>

            {/* ── Recent Activity ───────────────────────────────────── */}
            {recent.length > 0 && (
              <>
                <h3 style={{
                  fontSize: '15px', fontWeight: '600', color: 'var(--jp-text-light)',
                  textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px',
                }}>
                  Recent Activity
                </h3>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {recent.map((tx, i) => (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '13px 20px',
                      borderBottom: i < recent.length - 1 ? '1px solid var(--jp-border)' : 'none',
                    }}>
                      {/* Coloured dot */}
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                        background: ['payment','withdrawal'].includes(tx.transaction_type)
                          ? 'var(--jp-danger)' : 'var(--jp-success)',
                      }} />
                      {/* Description */}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                          {tx.business_name || tx.transaction_type}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--jp-text-light)', marginLeft: '8px' }}>
                          {tx.from_account_name}
                        </span>
                      </div>
                      {/* Amount */}
                      <span style={{
                        fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap',
                        color: ['payment','withdrawal'].includes(tx.transaction_type)
                          ? 'var(--jp-danger)' : 'var(--jp-success)',
                      }}>
                        {['payment','withdrawal'].includes(tx.transaction_type) ? '−' : '+'}
                        {parseFloat(tx.amount).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!loading && accounts.length === 0 && !error && (
          <div
            className="card"
            style={{ padding: '48px', textAlign: 'center', color: 'var(--jp-text-light)' }}
          >
            No accounts found. Please contact support.
          </div>
        )}
      </main>
    </div>
  )
}
