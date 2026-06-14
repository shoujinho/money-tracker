import { useState, useEffect, useCallback } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction } from './api'

const fmt = (n) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

const R = {
  modal: '24px',
  card: '20px',
  btn: '16px',
  row: '16px',
  input: '12px',
  action: '14px',
}

const glassCard = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: R.card,
  position: 'relative',
  overflow: 'hidden',
}

const highlight = {
  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
}

function groupByDate(transactions) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const groups = {}
  transactions.forEach(tx => {
    let label
    if (tx.date === todayStr) label = 'Today'
    else if (tx.date === yesterdayStr) label = 'Yesterday'
    else {
      const d = new Date(tx.date + 'T00:00:00')
      label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(tx)
  })
  return groups
}

function SkeletonCard() {
  return (
    <div style={{ ...glassCard, padding: '16px 18px' }}>
      <div style={highlight} />
      <div style={{ height: '10px', width: '40%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '22px', width: '70%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function BalanceCard({ label, amount }) {
  const isNegative = amount < 0
  return (
    <div style={{ ...glassCard, padding: '16px 18px' }}>
      <div style={highlight} />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '20px', fontWeight: 600, color: isNegative ? '#ff6b6b' : '#fff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {isNegative ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function TransactionRow({ tx, onEdit }) {
  const isPositive = tx.amount >= 0
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={() => onEdit(tx)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '11px 14px', borderRadius: R.row,
        background: pressed
          ? isPositive ? 'rgba(79,255,176,0.08)' : 'rgba(255,107,107,0.08)'
          : isPositive ? 'rgba(79,255,176,0.04)' : 'rgba(255,107,107,0.04)',
        border: `1px solid ${isPositive ? 'rgba(79,255,176,0.09)' : 'rgba(255,107,107,0.09)'}`,
        marginBottom: '2px',
        transition: 'background 0.1s',
        cursor: 'pointer',
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
        <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
          {tx.account_name}
        </p>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: isPositive ? '#4fffb0' : '#ff6b6b', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {isPositive ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

function TransactionModal({ mode, tx, accounts, onSave, onDelete, onClose }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    date: tx?.date ?? today(),
    description: tx?.description ?? '',
    amount: tx ? String(tx.amount) : '',
    account_id: tx?.account_id ?? accounts[0]?.id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    try {
      await onDelete(tx.id)
      onClose()
    } catch {
      setError('Could not delete. Try again.')
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.07)', color: '#fff',
    fontSize: '14px', fontWeight: 500, borderRadius: R.input,
    padding: '12px 14px', outline: 'none', boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.11)', fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  }

  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)', marginBottom: '8px'
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,5,12,0.75)', padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'rgba(18,18,28,0.92)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: R.modal,
        padding: '24px 20px 20px',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={highlight} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 60%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEdit && (
              <button
                onClick={handleDelete}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: confirmDelete ? 'rgba(255,107,107,0.25)' : 'rgba(255,107,107,0.1)',
                  border: `1px solid ${confirmDelete ? 'rgba(255,107,107,0.5)' : 'rgba(255,107,107,0.22)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title={confirmDelete ? 'Tap again to confirm' : 'Delete transaction'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={confirmDelete ? '#ff4444' : '#ff6b6b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}
            >×</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Description</label>
            <input autoFocus style={inputStyle} placeholder="e.g. Lunch, Client Payment" value={form.description} onChange={e => set('description', e.target.value)} onKeyDown={handleKey} />
          </div>
          <div>
            <label style={labelStyle}>Amount — positive = in, negative = out</label>
            <input type="number" step="any" style={inputStyle} placeholder="e.g. 5000 or -250" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={handleKey} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

        {error && <p style={{ fontSize: '12px', color: '#ff6b6b', margin: '10px 0 0', fontWeight: 500 }}>{error}</p>}
        {confirmDelete && <p style={{ fontSize: '12px', color: '#ff6b6b', margin: '10px 0 0', fontWeight: 500 }}>Tap the trash icon again to confirm deletion.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: '16px',
            background: loading ? 'rgba(255,255,255,0.1)' : '#ffffff',
            border: 'none', borderRadius: R.action,
            color: loading ? 'rgba(0,0,0,0.4)' : '#0a0a0f',
            fontSize: '15px', fontWeight: 700, padding: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [balances, setBalances] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [modal, setModal] = useState(null) // null | { mode: 'add' } | { mode: 'edit', tx }
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [b, a, t] = await Promise.all([getBalances(), getAccounts(), getTransactions()])
      setBalances(b)
      setAccounts(a)
      setTransactions(t)
      setError('')
    } catch {
      setError('Could not reach database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    if (modal?.mode === 'edit') {
      await updateTransaction(modal.tx.id, data)
    } else {
      await createTransaction(data)
    }
    await load()
  }

  const handleDelete = async (id) => {
    await deleteTransaction(id)
    await load()
  }

  const grouped = groupByDate(transactions)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#fff',
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: #16161f; color: #fff; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 500px 500px at 70% 5%, rgba(120,80,255,0.15) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,180,255,0.08) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '52px 20px 100px' }}>

        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>Money Tracker</p>

        {loading ? (
          <div style={{ height: '34px', width: '55%', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <h1 style={{ fontSize: '34px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: balances?.total < 0 ? '#ff6b6b' : '#fff' }}>
              {balances?.total < 0 ? '-' : ''}{fmt(balances?.total ?? 0)}
            </span>
          </h1>
        )}

        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px' }}>Total Balance</p>

        {error && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontSize: '12px', fontWeight: 500, borderRadius: R.input, padding: '12px 16px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
          {loading ? <><SkeletonCard /><SkeletonCard /></> : balances?.accounts.map(a => <BalanceCard key={a.id} label={a.name} amount={a.balance} />)}
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '24px' }} />

        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Recent Transactions</p>

        {!loading && transactions.length === 0 ? (
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
        ) : (
          Object.entries(grouped).map(([dateLabel, txs]) => (
            <div key={dateLabel} style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 8px 2px' }}>{dateLabel}</p>
              {txs.map(tx => <TransactionRow key={tx.id} tx={tx} onEdit={(tx) => setModal({ mode: 'edit', tx })} />)}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal({ mode: 'add' })}
        style={{
          position: 'fixed', bottom: '32px', right: '28px', zIndex: 40,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', fontSize: '26px', fontWeight: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          overflow: 'hidden', position: 'fixed',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
        +
      </button>

      {modal && (
        <TransactionModal
          mode={modal.mode}
          tx={modal.tx}
          accounts={accounts}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
