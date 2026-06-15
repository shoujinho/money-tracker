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

const R = { modal: '22px', card: '20px', row: '16px', input: '12px', action: '14px' }

// Color system
const C = {
  base: '#0a0a0f',
  mint: '#4fffb0',
  mintTint: 'rgba(79,255,176,0.08)',
  mintBorder: 'rgba(79,255,176,0.14)',
  mintHighlight: 'rgba(79,255,176,0.2)',
  amber: '#ffb032',
  amberTint: 'rgba(255,176,50,0.08)',
  amberBorder: 'rgba(255,176,50,0.14)',
  amberHighlight: 'rgba(255,176,50,0.2)',
  white: '#ffffff',
  text1: '#ffffff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  text4: 'rgba(255,255,255,0.22)',
}

// Glossy card style
const glossCard = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: R.card,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15)',
}

// Glossy subtle card (weekly/monthly)
const glossSubtle = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: R.card,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
}

function GlossHighlight({ color }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px',
      background: `linear-gradient(90deg, transparent, ${color || 'rgba(255,255,255,0.45)'}, transparent)`,
      zIndex: 1,
    }} />
  )
}

function GlossInnerGlow() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
      borderRadius: `${R.card} ${R.card} 0 0`,
      pointerEvents: 'none',
    }} />
  )
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
    <div style={{ ...glossCard, padding: '18px' }}>
      <GlossHighlight />
      <GlossInnerGlow />
      <div style={{ height: '10px', width: '40%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '14px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '24px', width: '70%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function BalanceCard({ label, amount }) {
  const isNeg = amount < 0
  return (
    <div style={{ ...glossCard, padding: '18px' }}>
      <GlossHighlight />
      <GlossInnerGlow />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text3, margin: '0 0 10px', position: 'relative', zIndex: 1 }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 600, color: isNeg ? C.amber : C.text1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', margin: 0, position: 'relative', zIndex: 1 }}>
        {isNeg ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function SummaryCard({ title, rangeLabel, moneyIn, moneyOut, net }) {
  return (
    <div style={{ ...glossSubtle, padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <GlossHighlight color="rgba(255,255,255,0.2)" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text4, margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.15)', margin: 0 }}>{rangeLabel}</p>
      </div>
      <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
        {[
          { val: moneyIn, label: 'In', color: C.mint },
          { val: moneyOut, label: 'Out', color: C.amber },
          { val: net, label: 'Net', color: net >= 0 ? C.text2 : C.amber }
        ].map(({ val, label, color }) => (
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
  const isPos = Number(tx.amount) >= 0
  const [pressed, setPressed] = useState(false)
  const tint = isPos ? C.mintTint : C.amberTint
  const border = isPos ? C.mintBorder : C.amberBorder
  const hlColor = isPos ? C.mintHighlight : C.amberHighlight
  const color = isPos ? C.mint : C.amber

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
        padding: '13px 14px', borderRadius: R.row,
        background: pressed
          ? `linear-gradient(160deg, ${isPos ? 'rgba(79,255,176,0.12)' : 'rgba(255,176,50,0.12)'} 0%, ${tint} 100%)`
          : `linear-gradient(160deg, ${isPos ? 'rgba(79,255,176,0.08)' : 'rgba(255,176,50,0.08)'} 0%, ${isPos ? 'rgba(79,255,176,0.03)' : 'rgba(255,176,50,0.03)'} 100%)`,
        border: `1px solid ${border}`,
        boxShadow: `inset 0 1px 0 ${hlColor}`,
        marginBottom: '4px', transition: 'background 0.1s', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: `linear-gradient(90deg, transparent, ${hlColor}, transparent)` }} />
      <div style={{ width: '3px', height: '30px', borderRadius: '2px', flexShrink: 0, background: `linear-gradient(180deg, ${isPos ? '#7fffcc' : '#ffd080'}, ${color})` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: C.text1, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{tx.description}</p>
        <p style={{ fontSize: '10px', fontWeight: 500, color: C.text4, margin: '2px 0 0' }}>{tx.account_name}</p>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {isPos ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

function DateGroup({ dateLabel, txs, onEdit, showDailyNet = false }) {
  const net = getDailyNet(txs)
  const isPos = net >= 0
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 10px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text4, margin: 0 }}>{dateLabel}</p>
        {showDailyNet && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: isPos ? 'rgba(79,255,176,0.6)' : 'rgba(255,176,50,0.6)', fontVariantNumeric: 'tabular-nums' }}>
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
    width: '100%',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.05) 100%)',
    color: C.text1,
    fontSize: '15px',
    fontWeight: 500,
    borderRadius: R.input,
    padding: '14px 16px',
    outline: 'none',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.14)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: C.text4,
    marginBottom: '8px',
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.80)', padding: '24px' }}
    >
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'linear-gradient(160deg, rgba(30,32,48,0.97) 0%, rgba(18,18,28,0.96) 60%, rgba(12,14,22,0.97) 100%)',
        border: '1px solid rgba(255,255,255,0.20)',
        borderRadius: R.modal,
        padding: '28px 24px 24px',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.3), 0 40px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Top highlight */}
        <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
        {/* Inner top glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)', borderRadius: `${R.modal} ${R.modal} 0 0`, pointerEvents: 'none' }} />
        {/* Side highlights */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 50%, transparent)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 50%, transparent)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEdit && (
              <button onClick={handleDelete} style={{ width: '34px', height: '34px', borderRadius: '50%', background: confirmDelete ? 'rgba(255,176,50,0.2)' : 'rgba(255,176,50,0.08)', border: `1px solid ${confirmDelete ? 'rgba(255,176,50,0.5)' : 'rgba(255,176,50,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={confirmDelete ? C.amber : 'rgba(255,176,50,0.7)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: C.text3, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div>
            <label style={labelStyle}>Description</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
              <input autoFocus style={inputStyle} placeholder="e.g. Lunch, Client Payment" value={form.description} onChange={e => set('description', e.target.value)} onKeyDown={handleKey} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Amount — positive = in, negative = out</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
              <input type="number" step="any" style={inputStyle} placeholder="e.g. 5000 or -250" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={handleKey} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Account</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
                <select style={inputStyle} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
                <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {error && <p style={{ fontSize: '12px', color: C.amber, margin: '12px 0 0', fontWeight: 500, position: 'relative', zIndex: 1 }}>{error}</p>}
        {confirmDelete && !error && <p style={{ fontSize: '12px', color: C.amber, margin: '12px 0 0', fontWeight: 500, position: 'relative', zIndex: 1 }}>Tap the trash icon again to confirm.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: '20px', position: 'relative', zIndex: 1,
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(235,235,235,1) 100%)',
            border: 'none', borderRadius: R.action,
            color: loading ? 'rgba(0,0,0,0.3)' : C.base,
            fontSize: '15px', fontWeight: 700, padding: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            boxShadow: loading ? 'none' : 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'rgba(255,255,255,1)' }} />
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}

function NavBar({ screen, setScreen, onAdd }) {
  const DashIcon = ({ active }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke={active ? C.text1 : C.text4}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
  const HistIcon = ({ active }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" stroke={active ? C.text1 : C.text4}>
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )

  const navItem = (id, label, Icon) => {
    const isActive = screen === id
    return (
      <button
        onClick={() => setScreen(id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          padding: '7px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
          background: isActive
            ? 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)'
            : 'transparent',
          boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
          transition: 'background 0.15s',
        }}
      >
        {isActive && (
          <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }} />
        )}
        <Icon active={isActive} />
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isActive ? C.text1 : C.text4 }}>{label}</span>
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 40, display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '2px',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.26)',
        borderRadius: '999px', padding: '5px 6px',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)', borderRadius: '999px 999px 0 0', pointerEvents: 'none' }} />
        {navItem('dashboard', 'Dashboard', DashIcon)}
        {navItem('history', 'History', HistIcon)}
      </div>
      <button
        onClick={onAdd}
        style={{
          width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.26)',
          color: C.text1, fontSize: '22px', fontWeight: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)', borderRadius: '50% 50% 0 0', pointerEvents: 'none' }} />
        +
      </button>
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
      style={{
        position: 'fixed', bottom: '32px', right: '28px', zIndex: 40,
        width: '48px', height: '48px', borderRadius: '50%',
        background: pressed
          ? 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)'
          : 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.26)',
        color: C.text1, fontSize: '22px', fontWeight: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden', transition: 'background 0.1s', position: 'fixed',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
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
  const weekly = getWeeklySummary(transactions)
  const monthly = getMonthlySummary(transactions)

  return (
    <div style={{ minHeight: '100vh', background: C.base, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text1 }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: #16161f; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Ambient teal glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 500px 600px at 50% 5%, rgba(20,180,140,0.20) 0%, transparent 65%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,200,120,0.07) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '52px 24px 120px' }}>

        {screen === 'dashboard' && (
          <>
            {/* Left-aligned balance */}
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text4, margin: '0 0 12px' }}>Money Tracker</p>
            {loading
              ? <div style={{ height: '42px', width: '55%', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              : <h1 style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, margin: '0 0 6px', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: (balances?.total ?? 0) < 0 ? C.amber : C.text1 }}>
                    {(balances?.total ?? 0) < 0 ? '-' : ''}{fmt(balances?.total ?? 0)}
                  </span>
                </h1>
            }
            <p style={{ fontSize: '11px', fontWeight: 500, color: C.text3, margin: '0 0 28px' }}>Total Balance</p>

            {error && <div style={{ background: 'rgba(255,176,50,0.1)', border: '1px solid rgba(255,176,50,0.3)', color: C.amber, fontSize: '12px', fontWeight: 500, borderRadius: R.input, padding: '12px 16px', marginBottom: '20px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {loading ? <><SkeletonCard /><SkeletonCard /></> : balances?.accounts.map(a => <BalanceCard key={a.id} label={a.name} amount={a.balance} />)}
            </div>

            {!loading && <SummaryCard title="This Week" rangeLabel={weekly.rangeLabel} moneyIn={weekly.moneyIn} moneyOut={weekly.moneyOut} net={weekly.net} />}

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '20px' }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text4, margin: '0 0 16px' }}>Recent</p>

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: '14px', fontWeight: 500, color: C.text4, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(recentGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={false} />)
            }
          </>
        )}

        {screen === 'history' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text3, margin: '0 0 4px' }}>All Transactions</p>
              <p style={{ fontSize: '12px', fontWeight: 500, color: C.text4, margin: 0 }}>
                {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} · {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {!loading && <SummaryCard title="This Month" rangeLabel={monthly.monthLabel} moneyIn={monthly.moneyIn} moneyOut={monthly.moneyOut} net={monthly.net} />}

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: '14px', fontWeight: 500, color: C.text4, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(allGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={true} />)
            }
          </>
        )}
      </div>

<NavBar screen={screen} setScreen={setScreen} onAdd={() => setModal({ mode: 'add' })} />

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
