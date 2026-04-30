import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getSubscriptions, blockBusiness, unblockBusiness, getCurrentUser, setCap, removeCap } from '../api'

/**
 * Subscriptions page — Subscription Management Interface
 *
 * Shows every business the user has paid 2+ times (i.e. a recurring charge).
 * The user can block or unblock any of them.
 * Once blocked, the backend will reject any new payment to that business.
 *
 * This solves the real-world problem:
 *   "I'm being charged for services I forgot about and no longer want."
 */
export default function Subscriptions() {
  const [user, setUser]               = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [actionMsg, setActionMsg]     = useState('')
  const [busy, setBusy]               = useState(null)
  const [capBusy, setCapBusy]         = useState(null) // business_id whose cap is being saved
  const navigate = useNavigate()

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const [userData, subs] = await Promise.all([getCurrentUser(), getSubscriptions()])
        setUser(userData.user)
        setSubscriptions(subs)
      } catch (err) {
        if (err.message.includes('401') || err.message.includes('403')) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [navigate])

  // ── Block / unblock handler ───────────────────────────────────────────────
  async function toggleBlock(businessId, currentlyBlocked) {
    setBusy(businessId)
    setActionMsg('')
    try {
      const res = currentlyBlocked
        ? await unblockBusiness(businessId)
        : await blockBusiness(businessId)

      setActionMsg(res.message)

      setSubscriptions(prev =>
        prev.map(s =>
          s.business_id === businessId ? { ...s, is_blocked: !currentlyBlocked } : s
        )
      )
    } catch (err) {
      setActionMsg('Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  // ── Set / remove cap handler ──────────────────────────────────────────────
  async function handleSetCap(businessId, capValue) {
    setCapBusy(businessId)
    setActionMsg('')
    try {
      if (!capValue) {
        const res = await removeCap(businessId)
        setActionMsg(res.message)
        setSubscriptions(prev =>
          prev.map(s => s.business_id === businessId ? { ...s, monthly_cap: null } : s)
        )
      } else {
        const res = await setCap(businessId, capValue)
        setActionMsg(res.message)
        setSubscriptions(prev =>
          prev.map(s => s.business_id === businessId ? { ...s, monthly_cap: res.monthly_cap } : s)
        )
      }
    } catch (err) {
      setActionMsg('Could not update cap. Please try again.')
    } finally {
      setCapBusy(null)
    }
  }

  // ── Derived counts ────────────────────────────────────────────────────────
  const blockedCount = subscriptions.filter(s => s.is_blocked).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--jp-bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

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

        {/* ── Page header ───────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
            Subscription Manager
          </h1>
          <p style={{ color: 'var(--jp-text-light)', fontSize: '14px', maxWidth: '560px' }}>
            These are merchants you have paid more than once. If you no longer want a
            service, block it here — any future payment attempt will be automatically declined,
            keeping your money in your account.
          </p>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        {!loading && subscriptions.length > 0 && (
          <div
            style={{
              display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap',
            }}
          >
            <StatPill
              label="Recurring charges found"
              value={subscriptions.length}
              color="var(--jp-blue)"
            />
            <StatPill
              label="Currently blocked"
              value={blockedCount}
              color={blockedCount > 0 ? 'var(--jp-danger)' : 'var(--jp-text-light)'}
            />
            <StatPill
              label="Active subscriptions"
              value={subscriptions.length - blockedCount}
              color="var(--jp-success)"
            />
          </div>
        )}

        {/* ── Feedback toast ────────────────────────────────────────── */}
        {actionMsg && (
          <div
            style={{
              background: '#EAF4EC', border: '1px solid #B2DFB8',
              color: 'var(--jp-success)', borderRadius: 'var(--jp-radius)',
              padding: '10px 16px', fontSize: '14px', marginBottom: '20px',
            }}
          >
            {actionMsg}
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--jp-text-light)', padding: '60px 0' }}>
            Loading your subscriptions…
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!loading && subscriptions.length === 0 && (
          <div
            className="card"
            style={{ padding: '48px', textAlign: 'center', color: 'var(--jp-text-light)' }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>No recurring charges found</div>
            <div style={{ fontSize: '13px' }}>
              Businesses appear here once you have paid them at least twice.
            </div>
          </div>
        )}

        {/* ── Subscription rows ─────────────────────────────────────── */}
        {!loading &&
          subscriptions.map(sub => (
            <SubscriptionRow
              key={sub.business_id}
              sub={sub}
              isBusy={busy === sub.business_id}
              isCapBusy={capBusy === sub.business_id}
              onToggle={() => toggleBlock(sub.business_id, sub.is_blocked)}
              onSetCap={(val) => handleSetCap(sub.business_id, val)}
            />
          ))}
      </main>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatPill({ label, value, color }) {
  return (
    <div
      className="card"
      style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}
    >
      <span style={{ fontSize: '22px', fontWeight: '700', color }}>{value}</span>
      <span style={{ fontSize: '13px', color: 'var(--jp-text-light)' }}>{label}</span>
    </div>
  )
}

function SubscriptionRow({ sub, isBusy, isCapBusy, onToggle, onSetCap }) {
  const fmtGBP = v =>
    parseFloat(v).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })

  const [capInput, setCapInput] = useState(sub.monthly_cap || '')

  // Determine if cap is close to being hit (>= 80%)
  const capWarning = sub.monthly_cap && sub.monthly_spent &&
    parseFloat(sub.monthly_spent) / parseFloat(sub.monthly_cap) >= 0.8

  return (
    <div
      className="card"
      style={{
        padding: '18px 22px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        opacity: sub.is_blocked ? 0.7 : 1,
        borderLeft: sub.is_blocked ? '4px solid var(--jp-danger)' : '4px solid transparent',
        transition: 'opacity 0.2s',
      }}
    >
      {/* Category icon */}
      <div
        style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
          background: sub.is_blocked ? '#FDECEA' : '#EEF3FB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}
      >
        {categoryIcon(sub.category)}
      </div>

      {/* Business details */}
      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>{sub.business_name}</span>
          {sub.is_blocked && (
            <span
              style={{
                background: '#FDECEA', color: 'var(--jp-danger)',
                fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px',
                padding: '2px 7px', borderRadius: '10px', textTransform: 'uppercase',
              }}
            >
              Blocked
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--jp-text-light)' }}>
          {sub.category} · {sub.payment_count} payments · {fmtGBP(sub.total_spent)} total
        </div>
        {/* Monthly cap status */}
        {sub.monthly_cap && (
          <div style={{
            fontSize: '12px', marginTop: '4px', fontWeight: '500',
            color: capWarning ? 'var(--jp-danger)' : 'var(--jp-success)',
          }}>
            {capWarning ? '⚠' : '✓'} {fmtGBP(sub.monthly_spent)} of {fmtGBP(sub.monthly_cap)} cap this month
          </div>
        )}
      </div>

      {/* Block / Unblock button */}
      <button
        onClick={onToggle}
        disabled={isBusy}
        style={{
          padding: '8px 20px',
          border: sub.is_blocked
            ? '1.5px solid var(--jp-success)'
            : '1.5px solid var(--jp-danger)',
          background: 'transparent',
          color: sub.is_blocked ? 'var(--jp-success)' : 'var(--jp-danger)',
          borderRadius: 'var(--jp-radius)',
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: '600',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          opacity: isBusy ? 0.5 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {isBusy ? '…' : sub.is_blocked ? 'Unblock' : 'Block'}
      </button>

      {/* Monthly cap input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--jp-text-light)', whiteSpace: 'nowrap' }}>£ cap/mo</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="none"
          value={capInput}
          onChange={e => setCapInput(e.target.value)}
          style={{
            width: '72px', padding: '6px 8px', border: '1.5px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius)', fontFamily: 'inherit', fontSize: '13px',
            background: '#fff', color: 'var(--jp-text)',
          }}
        />
        <button
          onClick={() => onSetCap(capInput)}
          disabled={isCapBusy}
          title={capInput ? `Set £${capInput}/month cap` : 'Remove cap'}
          style={{
            padding: '6px 12px', background: 'var(--jp-brown)', color: '#fff',
            border: 'none', borderRadius: 'var(--jp-radius)', fontFamily: 'inherit',
            fontSize: '12px', fontWeight: '600', cursor: isCapBusy ? 'not-allowed' : 'pointer',
            opacity: isCapBusy ? 0.5 : 1, whiteSpace: 'nowrap',
          }}
        >
          {isCapBusy ? '…' : capInput ? 'Set cap' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

/** Maps a business category name to an emoji icon. */
function categoryIcon(category) {
  const map = {
    Food:          '🍔',
    Retail:        '🛍️',
    Streaming:     '📺',
    Entertainment: '🎬',
    Gym:           '💪',
    Utilities:     '💡',
    Travel:        '✈️',
    Health:        '💊',
    Software:      '💻',
    Music:         '🎵',
  }
  return map[category] || '🏢'
}
