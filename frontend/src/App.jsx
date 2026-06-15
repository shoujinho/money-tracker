import { useState, useEffect, useCallback } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction } from './api'

const fmt = (n) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtK = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return '₱' + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 10000) return '₱' + (abs / 1000).toFixed(0) + 'k'
  return fmt(n)
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const R = { modal: '24px', card: '20px', row: '16px', input: '12px', action: '14px' }

const glassCard = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: R.card,
  position: 'relative',
  overflow: 'hidden',
}

const hl = {
  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function groupByDate(transactions) {
  const now = new Date()
  const todayStr = today()
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  const yesterdayStr = toDateStr(yest)
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

function getWeeklySummary(transactions) {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6)
  const weekStart = toDateStr(sunday)
  const weekEnd = toDateStr(saturday)
  const fmt2 = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  const rangeLabel = `${fmt2(sunday)} – ${fmt2(saturday)}`
  let moneyIn = 0, moneyOut = 0
  transactions.forEach(tx => {
    if (tx.date >= weekStart && tx.date <= weekEnd) {
      if (Number(tx.amount) > 0) moneyIn += Number(tx.amount)
      else moneyOut += Number(tx.amount)
    }
  })
  return { moneyIn, moneyOut, net: moneyIn + moneyOut, rangeLabel }
}

function getMonthlySummary(transactions) {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const monthEnd = today()
  const monthLabel = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  let moneyIn = 0, moneyOut = 0
  transactions.forEach(tx => {
    if (tx.date >= monthStart && tx.date <= monthEnd) {
      if (Number(tx.amount) > 0) moneyIn += Number(tx.amount)
      else moneyOut += Number(tx.amount)
    }
  })
  return { moneyIn, moneyOut, net: moneyIn + moneyOut, monthLabel }
}

function getDailyNet(txs) {
  return txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
}

function SkeletonCard() {
  return (
    <div style={{ ...glassCard, padding: '18px' }}>
      <div style={hl} />
      <div style={{ height: '10px', width: '40%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '14px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '24px', width: '70%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function BalanceCard({ label, amount }) {
  const isNeg = amount < 0
  return (
    <div style={{ ...glassCard, padding: '18px', textAlign: 'center' }}>
      <div style={hl} />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 600, color: isNeg ? '#ff6b6b' : '#fff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {isNeg ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function WeeklySummary({ transactions }) {
  const { moneyIn, moneyOut, net, rangeLabel } = getWeeklySummary(transactions)
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: R.card, padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      <div>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 2px' }}>This Week</p>
        <p style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.15)', margin: 0 }}>{rangeLabel}</p>
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {[{ val: moneyIn, label: 'In', color: '#4fffb0' }, { val: moneyOut, label: 'Out', color: '#ff6b6b' }, { val: net, label: 'Net', color: net >= 0 ? 'rgba(255,255,255,0.65)' : '#ff6b6b' }].map(({ val, label, color }) => (
          <div key={label} style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
              {label === 'Out' ? '-' : val >= 0 ? '+' : '-'}{fmtK(val)}
            </span>
            <span style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(255,255,255,0.2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthlySummary({ transactions }) {
  const { moneyIn, moneyOut, net, monthLabel } = getMonthlySummary(transactions)
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: R.card, padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      <div>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 2px' }}>This Month</p>
        <p style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.15)', margin: 0 }}>{monthLabel}</p>
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {[{ val: moneyIn, label: 'In', color: '#4fffb0' }, { val: moneyOut, label: 'Out', color: '#ff6b6b' }, { val: net, label: 'Net', color: net >= 0 ? 'rgba(255,255,255,0.65)' : '#ff6b6b' }].map(({ val, label, color }) => (
          <div key={label} style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
              {label === 'Out' ? '-' : val >= 0 ? '+' : '-'}{fmtK(val)}
            </span>
            <span style={{ fontSize: '8px', fontWeight: 500, color: 'rgba(255,255,255,0.2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TransactionRow({ tx, onEdit }) {
  const isPos = tx.amount >= 0
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
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 13px', borderRadius: R.row,
        background: pressed
          ? isPos ? 'rgba(79,255,176,0.08)' : 'rgba(255,107,107,0.08)'
          : isPos ? 'rgba(79,255,176,0.05)' : 'rgba(255,107,107,0.05)',
        border: `1px solid ${isPos ? 'rgba(79,255,176,0.10)' : 'rgba(255,107,107,0.10)'}`,
        marginBottom: '3px', transition: 'background 0.1s', cursor: 'pointer',
      }}
    >
      <div style={{ width: '3px', height: '28px', borderRadius: '2px', flexShrink: 0, background: isPos ? '#4fffb0' : '#ff6b6b' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.90)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{tx.description}</p>
        <p style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>{tx.account_name}</p>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: isPos ? '#4fffb0' : '#ff6b6b', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {isPos ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

function DateGroup({ dateLabel, txs, onEdit, showDailyNet = false }) {
  const net = getDailyNet(txs)
  const isPos = net >= 0
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{dateLabel}</p>
        {showDailyNet && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: isPos ? 'rgba(79,255,176,0.6)' : 'rgba(255,107,107,0.6)', fontVariantNumeric: 'tabular-nums' }}>
            {isPos ? '+' : '-'}{fmt(net)}
          </span>
        )}
      </div>
      {txs.map(tx => <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} />)}
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
    setLoading(true); setError('')
    try {
      await onSave({ ...form, amount, account_id: parseInt(form.account_id) })
      onClose()
    } catch { setError('Something went wrong. Try again.'); setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    try { await onDelete(tx.id); onClose() }
    catch { setError('Could not delete. Try again.'); setLoading(false) }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.07)', color: '#fff',
    fontSize: '14px', fontWeight: 500, borderRadius: R.input,
    padding: '12px 14px', outline: 'none', boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.11)', fontFamily: 'inherit', letterSpacing: '-0.01em',
  }

  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)', marginBottom: '8px'
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.75)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(18,18,28,0.92)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: R.modal, padding: '24px 20px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.6)' }}>
        <div style={hl} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 60%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEdit && (
              <button onClick={handleDelete} style={{ width: '32px', height: '32px', borderRadius: '50%', background: confirmDelete ? 'rgba(255,107,107,0.25)' : 'rgba(255,107,107,0.1)', border: `1px solid ${confirmDelete ? 'rgba(255,107,107,0.5)' : 'rgba(255,107,107,0.22)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={confirmDelete ? '#ff4444' : '#ff6b6b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
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
        {confirmDelete && !error && <p style={{ fontSize: '12px', color: '#ff6b6b', margin: '10px 0 0', fontWeight: 500 }}>Tap the trash icon again to confirm.</p>}

        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', marginTop: '16px', background: loading ? 'rgba(255,255,255,0.1)' : '#ffffff', border: 'none', borderRadius: R.action, color: loading ? 'rgba(0,0,0,0.4)' : '#0a0a0f', fontSize: '15px', fontWeight: 700, padding: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'background 0.15s' }}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}

function NavBar({ screen, setScreen }) {
  const DashIcon = ({ active }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#fff' : 'rgba(255,255,255,0.3)'}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
  const HistIcon = ({ active }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" stroke={active ? '#fff' : 'rgba(255,255,255,0.3)'}>
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )

  const navItem = (id, label, Icon) => (
    <button onClick={() => setScreen(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '7px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: screen === id ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 0.15s', fontFamily: 'inherit' }}>
      <Icon active={screen === id} />
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: screen === id ? '#fff' : 'rgba(255,255,255,0.3)' }}>{label}</span>
    </button>
  )

  return (
    <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(22,22,32,0.95)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '999px', padding: '5px 6px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)' }} />
        {navItem('dashboard', 'Dashboard', DashIcon)}
        {navItem('history', 'History', HistIcon)}
      </div>
    </div>
  )
}

function FAB({ onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ position: 'fixed', bottom: '32px', right: '28px', zIndex: 40, width: '56px', height: '56px', borderRadius: '50%', background: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: '26px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset', overflow: 'hidden', transition: 'background 0.1s' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
      +
    </button>
  )
}

export default function App() {
  const [balances, setBalances] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [modal, setModal] = useState(null)
  const [screen, setScreen] = useState('dashboard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [b, a, t] = await Promise.all([getBalances(), getAccounts(), getTransactions(200)])
      setBalances(b); setAccounts(a); setTransactions(t); setError('')
    } catch { setError('Could not reach database.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    if (modal?.mode === 'edit') await updateTransaction(modal.tx.id, data)
    else await createTransaction(data)
    await load()
  }

  const handleDelete = async (id) => { await deleteTransaction(id); await load() }

  const recent = transactions.slice(0, 7)
  const recentGrouped = groupByDate(recent)
  const allGrouped = groupByDate(transactions)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#fff' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: #16161f; color: #fff; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 500px 600px at 50% 5%, rgba(20,180,140,0.2) 0%, transparent 65%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,200,120,0.07) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '52px 20px 120px' }}>

        {screen === 'dashboard' && (
          <>
            {/* Foveal anchor — centered, dominant */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 10px' }}>Money Tracker</p>
              {loading
                ? <div style={{ height: '42px', width: '60%', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', margin: '0 auto 8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                : <h1 style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, margin: '0 0 6px', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: balances?.total < 0 ? '#ff6b6b' : '#fff' }}>{balances?.total < 0 ? '-' : ''}{fmt(balances?.total ?? 0)}</span>
                  </h1>
              }
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Total Balance</p>
            </div>

            {error && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontSize: '12px', fontWeight: 500, borderRadius: R.input, padding: '12px 16px', marginBottom: '20px' }}>{error}</div>}

            {/* Account cards — centered secondary fixation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {loading ? <><SkeletonCard /><SkeletonCard /></> : balances?.accounts.map(a => <BalanceCard key={a.id} label={a.name} amount={a.balance} />)}
            </div>

            {/* Weekly summary — compressed, tertiary fixation */}
            {!loading && <WeeklySummary transactions={transactions} />}

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '20px' }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 16px' }}>Recent</p>

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(recentGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={false} />)
            }
          </>
        )}

        {screen === 'history' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>All Transactions</p>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
                {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} · {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {!loading && <MonthlySummary transactions={transactions} />}

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(allGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={true} />)
            }
          </>
        )}
      </div>

      <FAB onClick={() => setModal({ mode: 'add' })} />
      <NavBar screen={screen} setScreen={setScreen} />

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
