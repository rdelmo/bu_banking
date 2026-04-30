/**
 * api.js — All calls to the Django backend live here.
 *
 * The Vite dev server proxies /api/* to http://localhost:8000,
 * so we never need to hard-code the backend URL.
 */

const BASE = '/api'

/** Returns the headers needed for an authenticated request. */
function authHeaders() {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Helper — throws a descriptive error if the response is not OK. */
async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Silently refresh the access token using the stored refresh token. Returns true on success. */
async function tryRefresh() {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('access_token', data.access)
    return true
  } catch {
    return false
  }
}

/** Authenticated fetch that automatically retries once after refreshing an expired token. */
async function authFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } })
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } })
    }
  }
  return res
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */

/**
 * Login with username + password.
 * Stores JWT tokens in localStorage and returns the full response
 * (which includes user profile and accounts).
 */
export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await handleResponse(res)
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  return data // { user, accounts, access, refresh }
}

/** Removes stored tokens — effectively logs the user out. */
export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

/* ── User ──────────────────────────────────────────────────────────────────── */

/**
 * Fetches the logged-in user's profile and their accounts.
 * Returns { user, accounts }
 */
export async function getCurrentUser() {
  const res = await authFetch(`${BASE}/user/`)
  return handleResponse(res)
}

/* ── Accounts ──────────────────────────────────────────────────────────────── */

/** Returns an array of Account objects belonging to the current user. */
export async function getMyAccounts() {
  const res = await authFetch(`${BASE}/accounts/my_accounts/`)
  return handleResponse(res)
}

/* ── Transactions ──────────────────────────────────────────────────────────── */

/** Returns all transactions for a given account ID. */
export async function getTransactions(accountId) {
  const res = await authFetch(`${BASE}/transactions/account/${accountId}/`)
  return handleResponse(res)
}

/** Returns spending totals grouped by business category for an account. */
export async function getSpendingSummary(accountId) {
  const res = await authFetch(`${BASE}/transactions/spending-summary/${accountId}/`)
  return handleResponse(res)
}

/* ── Subscriptions ─────────────────────────────────────────────────────────── */

/**
 * Returns businesses the user has paid 2+ times (recurring charges).
 * Each item includes { business_id, business_name, category,
 *                      payment_count, total_spent, is_blocked }
 */
export async function getSubscriptions() {
  const res = await authFetch(`${BASE}/subscriptions/`)
  return handleResponse(res)
}

/* ── Network Balance (admin only) ──────────────────────────────────────────── */

/**
 * Fetches the bank's live balance on the external payment network.
 * Only succeeds for admin users — returns { balance, currency }.
 */
export async function getNetworkBalance() {
  const res = await authFetch(`${BASE}/network-balance/`)
  return handleResponse(res)
}

/** Blocks a business — future payments to it from this user will be rejected. */
export async function blockBusiness(businessId) {
  const res = await authFetch(`${BASE}/subscriptions/block/${businessId}/`, { method: 'POST' })
  return handleResponse(res)
}

/** Removes a block — payments to this business are allowed again. */
export async function unblockBusiness(businessId) {
  const res = await authFetch(`${BASE}/subscriptions/unblock/${businessId}/`, { method: 'DELETE' })
  return handleResponse(res)
}

/** Sets (or updates) a monthly spending cap for a business. */
export async function setCap(businessId, monthlyCap) {
  const res = await fetch(`${BASE}/subscriptions/cap/${businessId}/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ monthly_cap: String(monthlyCap) }),
  })
  return handleResponse(res)
}

/** Removes a monthly spending cap for a business. */
export async function removeCap(businessId) {
  const res = await fetch(`${BASE}/subscriptions/cap/remove/${businessId}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse(res)
}

/* ── Businesses ────────────────────────────────────────────────────────────── */

/** Returns the full list of businesses (merchants). */
export async function getBusinesses() {
  const res = await fetch(`${BASE}/businesses/`, { headers: authHeaders() })
  return handleResponse(res)
}

/* ── Payments ──────────────────────────────────────────────────────────────── */

/**
 * Creates a payment transaction.
 * Throws an error with the backend message if the payment is blocked or invalid.
 */
export async function makePayment({ fromAccountId, businessId, amount }) {
  const res = await fetch(`${BASE}/transactions/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      transaction_type: 'payment',
      amount: String(amount),
      from_account: fromAccountId,
      business: businessId,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Creates a transfer between two of the user's own accounts.
 * Throws an error with the backend message on failure.
 */
export async function makeTransfer({ fromAccountId, toAccountId, amount }) {
  const res = await fetch(`${BASE}/transactions/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      transaction_type: 'transfer',
      amount: String(amount),
      from_account: fromAccountId,
      to_account: toAccountId,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Returns the 5 most recent transactions across all of the user's accounts.
 */
export async function getRecentTransactions() {
  const res = await fetch(`${BASE}/transactions/recent/`, { headers: authHeaders() })
  return handleResponse(res)
}
