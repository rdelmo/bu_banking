import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getTransactions, getSpendingSummary, getCurrentUser, getBusinesses, makePayment, makeTransfer } from '../api'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const TYPE_LABEL = {
  payment:         'Payment',
  withdrawal:      'Withdrawal',
  deposit:         'Deposit',
  collect_roundup: 'Collect Round-up',
  transfer:        'Transfer',
  roundup_reclaim: 'Round-up Reclaim',
}

// Colours for transaction amounts (red = money out, green = money in)
const TYPE_COLOUR = {
  payment:         'var(--jp-danger)',
  withdrawal:      'var(--jp-danger)',
  deposit:         'var(--jp-success)',
  collect_roundup: 'var(--jp-success)',
  transfer:        'var(--jp-blue)',
  roundup_reclaim: 'var(--jp-brown-mid)',
}

const INCOMING = ['deposit', 'collect_roundup']

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function fmt(amount) {
  return parseFloat(amount || 0).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ── Component ─────────────────────────────────────────────────────────────── */

/**
 * Transactions page
 * Shows an account's balance, a payment form, transaction history,
 * and a spending-by-category chart.
 */
export default function Transactions() {
  const { accountId } = useParams()
  const navigate      = useNavigate()

  const [user, setUser]               = useState(null)
  const [account, setAccount]         = useState(null)
  const [allAccounts, setAllAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary]         = useState([])
  const [businesses, setBusinesses]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  // Form mode: 'payment' | 'transfer'
  const [formMode, setFormMode]       = useState('payment')

  // Payment form state
  const [payBusiness, setPayBusiness] = useState('')
  const [payAmount, setPayAmount]     = useState('')
  const [payLoading, setPayLoading]   = useState(false)
  const [payResult, setPayResult]     = useState(null)

  // Transfer form state
  const [transferTo, setTransferTo]       = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferResult, setTransferResult]   = useState(null)

  useEffect(() => { loadAll() }, [accountId])

  // Load everything on mount
  async function loadAll() {
    try {
      const [userData, txns, spendingSummary, bizList] = await Promise.all([
        getCurrentUser(),
        getTransactions(accountId),
        getSpendingSummary(accountId),
        getBusinesses(),
      ])
      setUser(userData.user)
      setAccount(userData.accounts.find(a => a.id === accountId) || null)
      setAllAccounts(userData.accounts)
      setTransactions(txns)
      setSummary(spendingSummary)
      setBusinesses(bizList)
    } catch (err) {
      setError('Could not load transaction data.')
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch account + transactions after a payment (updates live balance)
  async function refreshAfterPayment() {
    try {
      const [userData, txns, spendingSummary] = await Promise.all([
        getCurrentUser(),
        getTransactions(accountId),
        getSpendingSummary(accountId),
      ])
      setAccount(userData.accounts.find(a => a.id === accountId) || null)
      setTransactions(txns)
      setSummary(spendingSummary)
    } catch (_) {}
  }

  // Handle payment form submission
  async function handlePayment(e) {
    e.preventDefault()
    setPayLoading(true)
    setPayResult(null)
    const selectedBiz = businesses.find(b => b.id === payBusiness)
    try {
      await makePayment({ fromAccountId: accountId, businessId: payBusiness, amount: payAmount })
      setPayResult({
        type: 'success',
        message: `✓  Payment of ${fmt(payAmount)} to ${selectedBiz?.name || payBusiness} was successful. Balance updated.`,
      })
      setPayBusiness('')
      setPayAmount('')
      await refreshAfterPayment()
    } catch (err) {
      setPayResult({ type: 'blocked', message: `✕  ${err.message}` })
    } finally {
      setPayLoading(false)
    }
  }

  // Handle transfer form submission
  async function handleTransfer(e) {
    e.preventDefault()
    setTransferLoading(true)
    setTransferResult(null)
    const dest = allAccounts.find(a => a.id === transferTo)
    try {
      await makeTransfer({ fromAccountId: accountId, toAccountId: transferTo, amount: transferAmount })
      setTransferResult({
        type: 'success',
        message: `✓  ${fmt(transferAmount)} transferred to ${dest?.name || transferTo}. Balance updated.`,
      })
      setTransferTo('')
      setTransferAmount('')
      await refreshAfterPayment()
    } catch (err) {
      setTransferResult({ type: 'error', message: `✕  ${err.message}` })
    } finally {
      setTransferLoading(false)
    }
  }

  const maxSpend = summary.length
    ? Math.max(...summary.map(s => parseFloat(s.total)))
    : 1

  // Prefer live current_balance; fall back to starting_balance
  const displayBalance = account?.current_balance ?? account?.starting_balance

  return (
    <div style={{ minHeight: '100vh', background: 'var(--jp-bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Back link ─────────────────────────────────────────────── */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--jp-brown)', fontSize: '14px', fontWeight: '500',
            fontFamily: 'inherit', padding: 0, marginBottom: '20px',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
        >
          ← Back to Home
        </button>

        {/* ── Account header ────────────────────────────────────────── */}
        {account && (
          <div
            style={{
              background: account.account_type === 'savings'
                ? 'linear-gradient(135deg, #1a6b3a 0%, #2ea854 100%)'
                : 'linear-gradient(135deg, #6B4C1E 0%, #C8922A 100%)',
              borderRadius: '14px', padding: '26px 30px', color: '#fff',
              marginBottom: '24px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {account.account_type}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {account.account_type === 'savings' ? 'Savings Account'
                  : account.account_type === 'current' ? 'Current Account'
                  : account.account_type === 'credit' ? 'Credit Account'
                  : 'Account'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', opacity: 0.65, marginBottom: '4px' }}>Current Balance</div>
              <div style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-1px' }}>
                {fmt(displayBalance)}
              </div>
            </div>
          </div>
        )}

        {/* ── Payment / Transfer form ───────────────────────────────── */}
        <div className="card" style={{ padding: '24px 26px', marginBottom: '28px' }}>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--jp-bg)', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
            {['payment', 'transfer'].map(mode => (
              <button
                key={mode}
                onClick={() => { setFormMode(mode); setPayResult(null); setTransferResult(null) }}
                style={{
                  padding: '7px 20px', border: 'none', borderRadius: '6px', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
                  background: formMode === mode ? 'var(--jp-brown)' : 'transparent',
                  color: formMode === mode ? '#fff' : 'var(--jp-text-light)',
                }}
              >
                {mode === 'payment' ? 'Pay Merchant' : 'Transfer'}
              </button>
            ))}
          </div>

          {/* ── Pay Merchant tab ──────────────────────────────────────── */}
          {formMode === 'payment' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--jp-text-light)', marginBottom: '18px' }}>
                Pay a merchant from this account. Blocked businesses will be declined instantly.
              </p>

              {payResult && (
                <div style={{
                  padding: '13px 16px', borderRadius: 'var(--jp-radius)', marginBottom: '18px',
                  fontSize: '14px', fontWeight: '500', lineHeight: 1.5,
                  ...(payResult.type === 'success'
                    ? { background: '#EAF4EC', border: '1px solid #B2DFB8', color: 'var(--jp-success)' }
                    : { background: '#FFF0EF', border: '1px solid #F5C6C2', color: 'var(--jp-danger)' }),
                }}>
                  {payResult.message}
                  {payResult.type === 'blocked' && (
                    <span onClick={() => navigate('/subscriptions')}
                      style={{ marginLeft: '10px', textDecoration: 'underline', cursor: 'pointer' }}>
                      Manage subscriptions →
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handlePayment} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2', minWidth: '180px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>Pay to</label>
                  <select className="input-field" value={payBusiness} onChange={e => setPayBusiness(e.target.value)} required>
                    <option value="">Select a merchant…</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '120px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>Amount (£)</label>
                  <input className="input-field" type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
                </div>
                <button type="submit" disabled={payLoading} style={{
                  padding: '10px 24px', background: 'var(--jp-brown)', color: '#fff',
                  border: 'none', borderRadius: 'var(--jp-radius)', fontFamily: 'inherit',
                  fontSize: '14px', fontWeight: '600', height: '42px', whiteSpace: 'nowrap',
                  cursor: payLoading ? 'not-allowed' : 'pointer', opacity: payLoading ? 0.6 : 1,
                }}>
                  {payLoading ? 'Processing…' : 'Make Payment'}
                </button>
              </form>
            </>
          )}

          {/* ── Transfer tab ──────────────────────────────────────────── */}
          {formMode === 'transfer' && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--jp-text-light)', marginBottom: '18px' }}>
                Move money between your own accounts instantly.
              </p>

              {transferResult && (
                <div style={{
                  padding: '13px 16px', borderRadius: 'var(--jp-radius)', marginBottom: '18px',
                  fontSize: '14px', fontWeight: '500', lineHeight: 1.5,
                  ...(transferResult.type === 'success'
                    ? { background: '#EAF4EC', border: '1px solid #B2DFB8', color: 'var(--jp-success)' }
                    : { background: '#FFF0EF', border: '1px solid #F5C6C2', color: 'var(--jp-danger)' }),
                }}>
                  {transferResult.message}
                </div>
              )}

              <form onSubmit={handleTransfer} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2', minWidth: '180px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>Transfer to</label>
                  <select className="input-field" value={transferTo} onChange={e => setTransferTo(e.target.value)} required>
                    <option value="">Select destination account…</option>
                    {allAccounts.filter(a => a.id !== accountId).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '120px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>Amount (£)</label>
                  <input className="input-field" type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
                </div>
                <button type="submit" disabled={transferLoading} style={{
                  padding: '10px 24px', background: 'var(--jp-brown)', color: '#fff',
                  border: 'none', borderRadius: 'var(--jp-radius)', fontFamily: 'inherit',
                  fontSize: '14px', fontWeight: '600', height: '42px', whiteSpace: 'nowrap',
                  cursor: transferLoading ? 'not-allowed' : 'pointer', opacity: transferLoading ? 0.6 : 1,
                }}>
                  {transferLoading ? 'Transferring…' : 'Transfer'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Page-level error ──────────────────────────────────────── */}
        {error && (
          <div style={{
            background: '#FFF0EF', border: '1px solid #F5C6C2', color: 'var(--jp-danger)',
            borderRadius: 'var(--jp-radius)', padding: '12px 16px', marginBottom: '24px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>

          {/* ── LEFT: transaction list ─────────────────────────────── */}
          <div>
            <h3 style={{
              fontSize: '15px', fontWeight: '600', color: 'var(--jp-text-light)',
              textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px',
            }}>
              Transaction History
            </h3>

            {loading && (
              <div style={{ textAlign: 'center', color: 'var(--jp-text-light)', padding: '48px 0', fontSize: '15px' }}>
                Loading transactions…
              </div>
            )}

            {!loading && transactions.length === 0 && (
              <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--jp-text-light)', fontSize: '14px' }}>
                No transactions yet. Make your first payment above.
              </div>
            )}

            {!loading && transactions.map(tx => (
              <div key={tx.id} className="card" style={{
                padding: '14px 18px', marginBottom: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                {/* Icon circle */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: `${TYPE_COLOUR[tx.transaction_type] || '#999'}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {INCOMING.includes(tx.transaction_type) ? '↓' : '↑'}
                </div>

                {/* Description */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {tx.business_name || TYPE_LABEL[tx.transaction_type] || tx.transaction_type}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--jp-text-light)', marginTop: '2px' }}>
                    {tx.business_name
                      ? `${TYPE_LABEL[tx.transaction_type]} · ${fmtDate(tx.timestamp)}`
                      : fmtDate(tx.timestamp)}
                  </div>
                </div>

                {/* Amount */}
                <div style={{
                  fontWeight: '700', fontSize: '15px',
                  color: TYPE_COLOUR[tx.transaction_type] || 'var(--jp-text)',
                  whiteSpace: 'nowrap',
                }}>
                  {INCOMING.includes(tx.transaction_type) ? '+' : '−'}{fmt(tx.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* ── RIGHT: spending summary ────────────────────────────── */}
          <div>
            <h3 style={{
              fontSize: '15px', fontWeight: '600', color: 'var(--jp-text-light)',
              textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px',
            }}>
              Spending by Category
            </h3>

            <div className="card" style={{ padding: '20px 22px' }}>
              {loading && <p style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>Loading…</p>}
              {!loading && summary.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>No spending data yet.</p>
              )}
              {!loading && summary.map((item, i) => {
                const pct = (parseFloat(item.total) / maxSpend) * 100
                const category = item.business__category || 'Other'
                return (
                  <div key={i} style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                      <span style={{ fontWeight: '500' }}>{category}</span>
                      <span style={{ color: 'var(--jp-text-light)' }}>{fmt(item.total)}</span>
                    </div>
                    <div style={{ background: '#EDE3D6', borderRadius: '4px', height: '7px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'var(--jp-brown-mid)', borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
