import { useState, useEffect, useCallback } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction } from './api'

const fmt = (n) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

function BalanceCard({ label, amount }) {
  const isNegative = amount < 0
  return (
    <div className="rounded-xl p-5 flex flex-col gap-1 bg-zinc-900">
      <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${isNegative ? 'text-red-400' : 'text-white'}`}>
        {isNegative ? '-' : ''}{fmt(amount)}
      </span>
    </div>
  )
}

function TransactionRow({ tx, onDelete }) {
  const isPositive = tx.amount >= 0
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return }
    onDelete(tx.id)
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0 group">
      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{tx.description}</p>
        <p className="text-xs text-zinc-500">{tx.date} · {tx.account_name}</p>
      </div>
      <span className={`text-sm font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : '-'}{fmt(tx.amount)}
      </span>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        className={`text-xs px-2 py-1 rounded transition-all ${
          confirming
            ? 'bg-red-600 text-white'
            : 'text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100'
        }`}
      >
        {confirming ? 'Confirm' : 'Delete'}
      </button>
    </div>
  )
}

function AddTransactionModal({ accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    date: today(),
    description: '',
    amount: '',
    account_id: accounts[0]?.id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.description.trim()) { setError('Description is required.'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || form.amount === '') { setError('Enter a valid amount (e.g. 5000 or -250).'); return }

    setLoading(true)
    setError('')
    try {
      await onSave({ ...form, amount, account_id: parseInt(form.account_id) })
      onClose()
    } catch (e) {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-5 border border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Add Transaction</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">x</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <input
              autoFocus
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600"
              placeholder="e.g. Lunch, Client Payment"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Amount — positive = money in, negative = money out
            </label>
            <input
              type="number"
              step="any"
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600"
              placeholder="e.g. 5000 or -250"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Account</label>
              <select
                className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-zinc-600"
                value={form.account_id}
                onChange={e => set('account_id', e.target.value)}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date</label>
              <input
                type="date"
                className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-zinc-600"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-white text-black text-sm font-medium rounded-lg py-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [balances, setBalances] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [b, a, t] = await Promise.all([getBalances(), getAccounts(), getTransactions()])
      setBalances(b)
      setAccounts(a)
      setTransactions(t)
      setError('')
    } catch {
      setError('Could not connect to backend. Is the server running?')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    await createTransaction(data)
    await load()
  }

  const handleDelete = async (id) => {
    await deleteTransaction(id)
    await load()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-4 pt-10 pb-24">

        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-zinc-600 mb-1">Money Tracker</p>
          <h1 className="text-3xl font-semibold tabular-nums">
            {balances ? (
              <span className={balances.total < 0 ? 'text-red-400' : ''}>
                {balances.total < 0 ? '-' : ''}{fmt(balances.total)}
              </span>
            ) : (
              <span className="text-zinc-700">Loading...</span>
            )}
          </h1>
          <p className="text-xs text-zinc-600 mt-1">Total balance</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950 border border-red-800 text-red-300 text-xs rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {balances?.accounts.map(a => (
            <BalanceCard key={a.id} label={a.name} amount={a.balance} />
          )) ?? (
            <>
              <BalanceCard label="Cash" amount={0} />
              <BalanceCard label="GCash" amount={0} />
            </>
          )}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="w-full bg-white text-black text-sm font-medium rounded-xl py-3.5 hover:bg-zinc-200 transition-colors mb-8"
        >
          + Add Transaction
        </button>

        <div>
          <p className="text-xs tracking-widest uppercase text-zinc-600 mb-4">Recent Transactions</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">No transactions yet. Add your first one.</p>
          ) : (
            <div>
              {transactions.map(tx => (
                <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTransactionModal
          accounts={accounts}
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
