import { useState, useEffect, useCallback } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction } from './api'

const fmt = (n) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

const glassCard = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '20px',
  position: 'relative',
  overflow: 'hidden',
}

const glassHighlight = {
  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
}

function BalanceCard({ label, amount }) {
  const isNegative = amount < 0
  return (
    <div style={{ ...glassCard, padding: '16px 18px' }}>
      <div style={glassHighlight} />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '21px', fontWeight: 600, color: isNegative ? '#ff6b6b' : '#fff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {isNegative ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function TransactionRow({ tx, onDelete }) {
  const isPositive = tx.amount >= 0
  const [confirming, setConfirming] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return }
    onDelete(tx.id)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '11px 14px', borderRadius: '14px',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '2px', transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: '3px', height: '30px', borderRadius: '2px', flexShrink: 0,
        background: isPositive ? '#4fffb0' : '#ff6b6b'
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.90)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
          {tx.description}
        </p>
        <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', letterSpacing: '0.01em' }}>
          {tx.date} · {tx.account_name}
        </p>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: isPositive ? '#4fffb0' : '#ff6b6b', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {isPositive ? '+' : '-'}{fmt(tx.amount)}
      </span>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        style={{
          fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '8px',
          border: confirming ? 'none' : '1px solid rgba(255,255,255,0.12)',
          background: confirming ? '#ff6b6b' : 'transparent',
          color: confirming ? '#000' : 'rgba(255,255,255,0.4)',
          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          opacity: hovered ? 1 : 0,
        }}
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
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', color: '#fff',
    fontSize: '14px', fontWeight: 500, borderRadius: '12px',
    padding: '12px 14px', outline: 'none', boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  }

  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginBottom: '8px'
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        padding: '20px',
      }}
    >
      <div style={{
        ...glassCard,
        width: '100%', maxWidth: '400px',
        padding: '28px 24px 28px',
        borderRadius: '24px',
      }}>
        <div style={glassHighlight} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Add Transaction</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.6)', width: '28px', height: '28px',
            borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit'
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Description</label>
            <input autoFocus style={inputStyle} placeholder="e.g. Lunch, Client Payment" value={form.description} onChange={e => set('description', e.target.value)} onKeyDown={handleKey} />
          </div>
          <div>
            <label style={labelStyle}>Amount — positive = in, negative = out</label>
            <input type="number" step="any" style={inputStyle} placeholder="e.g. 5000 or -250" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={handleKey} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Account</label>
              <select style={inputStyle} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '12px', fontWeight: 500 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: '20px',
            background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '14px', color: '#fff',
            fontSize: '15px', fontWeight: 700, padding: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
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
      setError('Could not reach database.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => { await createTransaction(data); await load() }
  const handleDelete = async (id) => { await deleteTransaction(id); await load() }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#fff',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 500px 500px at 70% 5%, rgba(120,80,255,0.15) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,180,255,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '52px 20px 80px' }}>

        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
          Money Tracker
        </p>
        <h1 style={{ fontSize: '44px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>
          {balances ? (
            <span style={{ color: balances.total < 0 ? '#ff6b6b' : '#fff' }}>
              {balances.total < 0 ? '-' : ''}{fmt(balances.total)}
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>Loading...</span>
          )}
        </h1>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: '28px', letterSpacing: '0.01em' }}>Total Balance</p>

        {error && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontSize: '12px', fontWeight: 500, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
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
          style={{
            width: '100%', marginBottom: '32px',
            ...glassCard,
            padding: '15px', fontSize: '15px', fontWeight: 700,
            color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            display: 'block', textAlign: 'center', letterSpacing: '-0.01em',
          }}
        >
          + Add Transaction
        </button>

        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
          Recent Transactions
        </p>

        {transactions.length === 0 ? (
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>
            No transactions yet. Add your first one.
          </p>
        ) : (
          <div>
            {transactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddTransactionModal accounts={accounts} onSave={handleSave} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
