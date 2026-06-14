const BASE = '/api'

export async function getBalances() {
  const res = await fetch(`${BASE}/balances`)
  if (!res.ok) throw new Error('Failed to fetch balances')
  return res.json()
}

export async function getAccounts() {
  const res = await fetch(`${BASE}/accounts`)
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

export async function getTransactions(limit = 20) {
  const res = await fetch(`${BASE}/transactions?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function createTransaction(data) {
  const res = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

export async function deleteTransaction(id) {
  const res = await fetch(`${BASE}/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete transaction')
}
