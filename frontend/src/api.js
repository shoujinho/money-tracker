const SUPABASE_URL = 'https://hridhhqfhuikurpviair.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyaWRoaHFmaHVpa3VycHZpYWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTg0MTEsImV4cCI6MjA5NzAzNDQxMX0.pU8D0Xh25WoWhf6p9BbXSmFbm1qpthSba8O_U4BwCpg'

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const db = (path) => `${SUPABASE_URL}/rest/v1${path}`

export async function getAccounts() {
  const res = await fetch(db('/accounts?order=id'), { headers })
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

export async function getBalances() {
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    fetch(db('/transactions?select=amount,account_id'), { headers }).then(r => r.json())
  ])

  const totals = {}
  accounts.forEach(a => totals[a.id] = 0)
  transactions.forEach(t => {
    if (totals[t.account_id] !== undefined) totals[t.account_id] += Number(t.amount)
  })

  const total = Object.values(totals).reduce((a, b) => a + b, 0)

  return {
    total,
    accounts: accounts.map(a => ({ ...a, balance: totals[a.id] }))
  }
}

export async function getTransactions(limit = 20) {
  const res = await fetch(
    db(`/transactions?select=*,accounts(name)&order=date.desc,created_at.desc&limit=${limit}`),
    { headers }
  )
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const rows = await res.json()
  return rows.map(t => ({ ...t, account_name: t.accounts?.name }))
}

export async function createTransaction(data) {
  const res = await fetch(db('/transactions'), {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      date: data.date,
      description: data.description,
      amount: data.amount,
      account_id: data.account_id,
    })
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

export async function updateTransaction(id, data) {
  const res = await fetch(db(`/transactions?id=eq.${id}`), {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      date: data.date,
      description: data.description,
      amount: data.amount,
      account_id: data.account_id,
    })
  })
  if (!res.ok) throw new Error('Failed to update transaction')
}

export async function deleteTransaction(id) {
  const res = await fetch(db(`/transactions?id=eq.${id}`), {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete transaction')
}

// ── RECURRING ──────────────────────────────────────────────────
export async function getRecurring() {
  const res = await fetch(db('/recurring?select=*,accounts(name)&order=day_of_month'), { headers })
  if (!res.ok) throw new Error('Failed to fetch recurring')
  const rows = await res.json()
  return rows.map(r => ({ ...r, account_name: r.accounts?.name }))
}

export async function createRecurring(data) {
  const res = await fetch(db('/recurring'), {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ name: data.name, amount: data.amount, account_id: data.account_id, day_of_month: data.day_of_month })
  })
  if (!res.ok) throw new Error('Failed to create recurring')
  return res.json()
}

export async function updateRecurring(id, data) {
  const res = await fetch(db(`/recurring?id=eq.${id}`), {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ name: data.name, amount: data.amount, account_id: data.account_id, day_of_month: data.day_of_month })
  })
  if (!res.ok) throw new Error('Failed to update recurring')
}

export async function deleteRecurring(id) {
  const res = await fetch(db(`/recurring?id=eq.${id}`), { method: 'DELETE', headers })
  if (!res.ok) throw new Error('Failed to delete recurring')
}

export async function getRecurringLogs(month, year) {
  const res = await fetch(db(`/recurring_logs?month=eq.${month}&year=eq.${year}`), { headers })
  if (!res.ok) throw new Error('Failed to fetch recurring logs')
  return res.json()
}

export async function createRecurringLog(recurringId, month, year, status, transactionId = null) {
  const res = await fetch(db('/recurring_logs'), {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ recurring_id: recurringId, month, year, status, logged_transaction_id: transactionId })
  })
  if (!res.ok) throw new Error('Failed to create recurring log')
  return res.json()
}

export async function deleteRecurringLog(recurringId, month, year) {
  const res = await fetch(db(`/recurring_logs?recurring_id=eq.${recurringId}&month=eq.${month}&year=eq.${year}`), { method: 'DELETE', headers })
  if (!res.ok) throw new Error('Failed to delete recurring log')
}
