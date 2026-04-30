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
        // Store the primary (current) account ID so other pages can link to it
        const primary = data.accounts.find(a => a.account_type === 'current') || data.accounts[0]
        if (primary) localStorage.setItem('primary_account_id', primary.id)
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

            {/* ── Quick Actions ──────────────────────────────────────── */}
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
              Quick Actions
            </h3>
            <div
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '24px 16px',
                marginBottom: '32px',
              }}
            >
              {[
                { label: 'Send Money',  icon: '↗' },
                { label: 'Rewards',     icon: '⭐' },
                { label: 'Statements',  icon: '📄' },
                { label: 'Support',     icon: '💬' },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => alert(`${label} — coming soon`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'var(--jp-brown-light)',
                      border: '1.5px solid var(--jp-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      transition: 'background 0.15s, transform 0.15s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#F0E4CC'
                      e.currentTarget.style.transform = 'translateY(-3px)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'var(--jp-brown-light)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--jp-text)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Promotions strip ──────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div
                className="card"
                style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #FDF3E3 0%, #fff 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🎯</span>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Refer a Friend</div>
                <div style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>
                  Earn £25 when a friend opens an LK account.
                </div>
                <button
                  onClick={() => alert('Referral programme — coming soon')}
                  style={{
                    marginTop: '8px', alignSelf: 'flex-start',
                    background: 'var(--jp-brown)', color: '#fff',
                    border: 'none', borderRadius: '6px',
                    padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                  }}
                >
                  Learn more
                </button>
              </div>
              <div
                className="card"
                style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #F0F7FF 0%, #fff 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '20px' }}>📈</span>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Savings Rate: 4.5% AER</div>
                <div style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>
                  Your savings are working harder with LK.
                </div>
                <button
                  onClick={() => alert('Savings details — coming soon')}
                  style={{
                    marginTop: '8px', alignSelf: 'flex-start',
                    background: '#003087', color: '#fff',
                    border: 'none', borderRadius: '6px',
                    padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                  }}
                >
                  View details
                </button>
              </div>
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

      {/* ── Site footer ───────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--jp-border)',
          background: '#fff',
          marginTop: '48px',
          padding: '32px 28px 24px',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

          {/* Top row: brand + columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '32px',
              marginBottom: '32px',
            }}
          >
            {/* Brand blurb */}
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--jp-brown)', marginBottom: '8px' }}>
                Lion Kings Bank
              </div>
              <p style={{ fontSize: '13px', color: 'var(--jp-text-light)', lineHeight: '1.6' }}>
                Trusted banking for everyone. Your money is safe,
                protected by 256-bit encryption and covered by the
                Financial Services Compensation Scheme (FSCS) up to £85,000.
              </p>
            </div>

            {/* Services */}
            <div>
              <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--jp-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Services</div>
              {['Current Accounts', 'Savings Accounts', 'Loans', 'Credit Cards'].map(item => (
                <div key={item} style={{ fontSize: '13px', color: 'var(--jp-text-light)', marginBottom: '8px', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--jp-brown)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--jp-text-light)'}
                >{item}</div>
              ))}
            </div>

            {/* Help */}
            <div>
              <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--jp-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Help</div>
              {['Contact Us', 'FAQs', 'Security Centre', 'Report Fraud'].map(item => (
                <div key={item} style={{ fontSize: '13px', color: 'var(--jp-text-light)', marginBottom: '8px', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--jp-brown)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--jp-text-light)'}
                >{item}</div>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--jp-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Legal</div>
              {['Privacy Policy', 'Cookie Policy', 'Terms & Conditions', 'Accessibility'].map(item => (
                <div key={item} style={{ fontSize: '13px', color: 'var(--jp-text-light)', marginBottom: '8px', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--jp-brown)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--jp-text-light)'}
                >{item}</div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--jp-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--jp-text-light)' }}>
              © 2026 Lion Kings Bank. All rights reserved. Authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🔒</span>
              <span style={{ fontSize: '12px', color: 'var(--jp-text-light)' }}>256-bit SSL Secured</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}
