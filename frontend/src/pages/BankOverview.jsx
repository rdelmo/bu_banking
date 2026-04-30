import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getCurrentUser, getNetworkBalance } from '../api'

const fmtGBP = (n) =>
  parseFloat(n).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 })

const fmtTime = (d) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
  ' · ' +
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const tokenRelated = (msg) =>
  msg.includes('401') || msg.includes('403') ||
  msg.toLowerCase().includes('token') ||
  msg.toLowerCase().includes('not valid') ||
  msg.toLowerCase().includes('credentials')

export default function BankOverview() {
  const [user, setUser]               = useState(null)
  const [networkData, setNetworkData]       = useState(null)
  const [balanceUnavailable, setBalanceUnavailable] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)
  const [error, setError]                   = useState('')
  const [refreshedAt, setRefreshedAt]       = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'terminal' ? 'terminal' : 'overview'

  const loadData = useCallback(async (initial = false) => {
    if (!initial) setRefreshing(true)
    try {
      const balanceResult = await getNetworkBalance().then(v => ({ status: 'fulfilled', value: v })).catch(e => ({ status: 'rejected', reason: e }))

      if (balanceResult.status === 'fulfilled') {
        setNetworkData(balanceResult.value)
        setBalanceUnavailable(false)
      } else {
        setBalanceUnavailable(true)
        setNetworkData(null)
      }

      setRefreshedAt(new Date())
    } finally {
      if (!initial) setRefreshing(false)
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    async function init() {
      try {
        const userData = await getCurrentUser()
        if (!userData.user.is_staff) { navigate('/dashboard'); return }
        setUser(userData.user)
        await loadData(true)
      } catch (err) {
        const msg = err.message || ''
        if (tokenRelated(msg)) navigate('/login')
        else { setError(msg || 'Unable to load.'); setLoading(false) }
      }
    }
    init()
  }, [navigate, loadData])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #7D532F 0%, #673F1B 55%, #422407 100%)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '36px 24px' }}>

        {/* ── Page header ───────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px', padding: '28px 32px', color: '#fff',
          marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '6px' }}>
              Lion Kings Bank · Restricted Access
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', letterSpacing: '-0.4px' }}>
              Bank Management Portal
            </h2>
            <p style={{ opacity: 0.65, fontSize: '13px' }}>
              Real-time settlement monitoring &amp; operations centre
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!loading && !error && activeTab === 'overview' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
                borderRadius: '20px', padding: '5px 14px',
              }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80',
                  display: 'inline-block', animation: 'pulse-green 2s infinite',
                }} />
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#4ade80' }}>LIVE</span>
              </div>
            )}
            {activeTab === 'overview' && (
              <button
                onClick={() => loadData(false)}
                disabled={refreshing || loading}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff', borderRadius: '8px', padding: '7px 18px', fontSize: '13px',
                  cursor: (refreshing || loading) ? 'not-allowed' : 'pointer',
                  opacity: (refreshing || loading) ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >
                {refreshing ? 'Refreshing…' : '↻ Refresh'}
              </button>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.35)',
            color: '#fca5a5', borderRadius: 'var(--jp-radius)', padding: '12px 16px',
            marginBottom: '24px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* ══════════════ TAB: BANK VIEW ════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Last updated */}
            {refreshedAt && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', textAlign: 'right', letterSpacing: '0.3px' }}>
                ⏱ Last updated: {fmtTime(refreshedAt)}
              </p>
            )}

            {loading && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '48px 0', fontSize: '14px' }}>
                Connecting to payment network…
              </div>
            )}

            {!loading && (networkData || balanceUnavailable || stats) && (
              <>
                {/* Top row: balance + currency */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'stretch' }}>
                  {/* Settlement balance */}
                  <div style={{
                    background: balanceUnavailable ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)',
                    borderRadius: '14px', padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                    opacity: balanceUnavailable ? 0.75 : 1,
                  }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--jp-text-light)', fontWeight: '600', marginBottom: '10px' }}>
                      Total Budget
                    </div>
                    {balanceUnavailable ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '36px', fontWeight: '700', color: '#aaa', letterSpacing: '-1px', lineHeight: 1 }}>
                            ——
                          </div>
                          <span style={{
                            fontSize: '11px', fontWeight: '600', background: '#f3f4f6',
                            border: '1px solid #d1d5db', color: '#6b7280',
                            borderRadius: '6px', padding: '3px 10px', letterSpacing: '0.5px',
                          }}>
                            PENDING API KEY
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--jp-text-light)', lineHeight: '1.5' }}>
                          Network balance unavailable — update <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>.env</code> with the v2 API key and restart Django to enable.
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '46px', fontWeight: '700', color: 'var(--jp-brown)', letterSpacing: '-2px', lineHeight: 1 }}>
                          {fmtGBP(networkData.total_budget)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--jp-text-light)', marginTop: '10px', lineHeight: '1.5' }}>
                          Live reserve held on the external payment network. Updated on each card transaction processed via the NFC terminal.
                        </div>
                      </>
                    )}
                  </div>
                  {/* Currency badge */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '14px', padding: '24px 32px', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px',
                  }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Currency</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>GBP</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>£ Sterling</div>
                  </div>
                </div>

                {/* Payment Network Details */}
                {networkData && !balanceUnavailable && (
                  <div style={{
                    background: 'rgba(255,255,255,0.95)', borderRadius: '14px',
                    padding: '22px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--jp-text)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Payment Network Account
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      {[
                        { label: 'Bank Name',            value: networkData.bank_name },
                        { label: 'Bank ID',              value: networkData.bank_id?.slice(0, 8) + '…' },
                        { label: 'Cards Issued',         value: networkData.issued ?? 0 },
                        { label: 'Total Budget',         value: fmtGBP(networkData.total_budget) },
                        { label: 'Remaining to Issue',   value: fmtGBP(networkData.remaining_to_issue) },
                        { label: 'Current Spendable',    value: fmtGBP(networkData.current_spendable) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ borderLeft: '3px solid var(--jp-brown)', paddingLeft: '12px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--jp-text-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--jp-brown)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {networkData.cards?.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--jp-border)', fontSize: '12px', color: 'var(--jp-text-light)' }}>
                        {networkData.cards.length} card{networkData.cards.length !== 1 ? 's' : ''} active on this account
                      </div>
                    )}
                  </div>
                )}



                {/* Bottom row: system status + quick links */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  {/* System Status */}
                  <div style={{
                    background: 'rgba(255,255,255,0.95)', borderRadius: '14px',
                    padding: '22px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--jp-text)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      System Status
                    </div>
                    {[
                      { name: 'Payment Network API', status: 'Operational', colour: '#22c55e' },
                      { name: 'NFC Terminal Server', status: 'Running', colour: '#22c55e' },
                      { name: 'Core Banking Database', status: 'Healthy', colour: '#22c55e' },
                      { name: 'Fraud Detection', status: 'Active', colour: '#22c55e' },
                      { name: 'Scheduled Maintenance', status: '09 May 02:00–04:00', colour: '#f59e0b' },
                    ].map(({ name, status, colour }) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--jp-border)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--jp-text)' }}>{name}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: colour, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colour, display: 'inline-block' }} />
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Links */}
                  <div style={{
                    background: 'rgba(255,255,255,0.95)', borderRadius: '14px',
                    padding: '22px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--jp-text)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Quick Actions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { icon: '📋', label: 'Generate Report' },
                        { icon: '👥', label: 'Manage Users' },
                        { icon: '🛡️', label: 'Compliance Centre' },
                        { icon: '📞', label: 'Support Desk' },
                        { icon: '🔔', label: 'Alerts & Notices' },
                        { icon: '⚙️', label: 'System Settings' },
                      ].map(({ icon, label }) => (
                        <button
                          key={label}
                          onClick={() => alert(`${label} — coming soon`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--jp-bg)', border: '1px solid var(--jp-border)',
                            borderRadius: '8px', padding: '10px 12px', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '500', color: 'var(--jp-text)',
                            fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--jp-brown)'; e.currentTarget.style.color = 'var(--jp-brown)' }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--jp-border)'; e.currentTarget.style.color = 'var(--jp-text)' }}
                        >
                          <span style={{ fontSize: '16px' }}>{icon}</span> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════ TAB: NFC PAYMENT TERMINAL ════════════════ */}
        {activeTab === 'terminal' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>

            {/* LEFT: guide */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #6B4C1E, #C8922A)',
                padding: '20px 24px', color: '#fff',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🖥️</div>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '3px' }}>NFC Payment Terminal</div>
                <div style={{ fontSize: '12px', opacity: 0.75 }}>Contactless card processing</div>
              </div>

              {/* Steps */}
              <div style={{ padding: '20px 22px' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--jp-text-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                  How to process a payment
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { step: '1', title: 'Start the terminal', desc: 'Run python local-terminal.py in a terminal window. The server starts on port 47823.' },
                    { step: '2', title: 'Select your NFC reader', desc: 'Pick your USB reader (e.g. ACR122U) from the dropdown in the terminal interface.' },
                    { step: '3', title: 'Enter charge amount', desc: 'Type the amount to deduct from the customer\'s card on the payment network.' },
                    { step: '4', title: 'Tap the card', desc: 'Click "Tap card", then hold the NFC card to the reader. The charge processes automatically.' },
                    { step: '5', title: 'Confirm the result', desc: 'A success or failure message confirms the transaction. The settlement balance updates in real time.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6B4C1E, #C8922A)',
                        color: '#fff', fontSize: '12px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{step}</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--jp-text)', marginBottom: '2px' }}>{title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--jp-text-light)', lineHeight: '1.55' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Open in tab link */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--jp-border)' }}>
                  <a
                    href="http://localhost:47823"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: 'var(--jp-bg)', border: '1px solid var(--jp-border)',
                      color: 'var(--jp-text)', borderRadius: '8px', padding: '10px',
                      fontSize: '13px', textDecoration: 'none', fontWeight: '500',
                    }}
                  >
                    ↗ Open terminal in new tab
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT: embedded terminal */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', borderRadius: '14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 18px', borderBottom: '1px solid var(--jp-border)',
                display: 'flex', alignItems: 'center', gap: '8px', background: '#fff',
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', color: 'var(--jp-text-light)', fontWeight: '500' }}>
                  Live terminal · localhost:47823
                </span>
              </div>
              <iframe
                src="http://localhost:47823"
                title="NFC Payment Terminal"
                style={{ width: '100%', height: '680px', border: 'none', display: 'block' }}
              />
            </div>
          </div>
        )}

      </main>

      <style>{`
        @keyframes pulse-green {
          0%   { box-shadow: 0 0 0 0   rgba(74, 222, 128, 0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0);   }
          100% { box-shadow: 0 0 0 0   rgba(74, 222, 128, 0);   }
        }
      `}</style>
    </div>
  )
}
