import { useState, useEffect, useCallback } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction } from './api'

// ── DESIGN TOKENS ──────────────────────────────────────────────
const T = {
  eyebrow:    { size: '12px', weight: 400, tracking: '-0.01em' },
  label:      { size: '12px', weight: 600, tracking: '-0.01em' },
  body:       { size: '15px', weight: 500, tracking: '-0.02em' },
  bodyStrong: { size: '15px', weight: 600, tracking: '-0.02em' },
  title:      { size: '17px', weight: 600, tracking: '-0.02em' },
  pageTitle:  { size: '19px', weight: 600, tracking: '-0.02em' },
  display:    { size: '28px', weight: 600, tracking: '-0.04em' },
  hero:       { size: '36px', weight: 600, tracking: '-0.04em' },
}

const C = {
  primary:   'rgba(255,255,255,1.0)',
  secondary: 'rgba(255,255,255,0.55)',
  tertiary:  'rgba(255,255,255,0.30)',
  muted:     'rgba(255,255,255,0.18)',
  mint:      '#4fffb0',
  amber:     '#ffb032',
  base:      '#0a0a0f',
}

const S = {
  card: {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 100%)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
  },
  float: {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
    border: '1px solid rgba(255,255,255,0.26)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.5)',
  },
  modal: {
    background: 'linear-gradient(160deg, rgba(30,32,48,0.97) 0%, rgba(18,18,28,0.96) 60%, rgba(12,14,22,0.97) 100%)',
    border: '1px solid rgba(255,255,255,0.20)',
    borderRadius: '24px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 40px 80px rgba(0,0,0,0.6)',
  },
  input: {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.05) 100%)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '12px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
  },
}

const R = { sm: '12px', md: '16px', lg: '20px', xl: '24px' }
const SP = { sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '32px' }

// ── UTILITIES ──────────────────────────────────────────────────
const fmt = (n) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtK = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return '₱' + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 10000) return '₱' + (abs / 1000).toFixed(0) + 'k'
  return fmt(n)
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const todayLabel = () => new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function groupByDate(transactions) {
  const now = new Date()
  const td = todayStr()
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  const yd = toDateStr(yest)
  const groups = {}
  transactions.forEach(tx => {
    let label
    if (tx.date === td) label = 'Today'
    else if (tx.date === yd) label = 'Yesterday'
    else label = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(tx)
  })
  return groups
}

function getWeeklySummary(transactions) {
  const now = new Date()
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay()); sun.setHours(0,0,0,0)
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
  const weekStart = toDateStr(sun)
  const weekEnd = toDateStr(sat)
  const fmt2 = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  let moneyIn = 0, moneyOut = 0
  transactions.forEach(tx => {
    if (tx.date >= weekStart && tx.date <= weekEnd) {
      if (Number(tx.amount) > 0) moneyIn += Number(tx.amount)
      else moneyOut += Number(tx.amount)
    }
  })
  return { moneyIn, moneyOut, net: moneyIn + moneyOut, rangeLabel: `${fmt2(sun)} – ${fmt2(sat)}` }
}

function getMonthlySummary(transactions) {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const monthEnd = todayStr()
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

const getDailyNet = (txs) => txs.reduce((sum, tx) => sum + Number(tx.amount), 0)

// ── SHARED COMPONENTS ──────────────────────────────────────────
function CardHighlight() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)', borderRadius: `${R.lg} ${R.lg} 0 0`, pointerEvents: 'none' }} />
    </>
  )
}

function FloatHighlight() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)', borderRadius: '999px 999px 0 0', pointerEvents: 'none' }} />
    </>
  )
}

function SkeletonCard() {
  return (
    <div style={{ ...S.card, padding: SP.lg }}>
      <CardHighlight />
      <div style={{ height: '12px', width: '40%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', marginBottom: '14px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '16px', width: '65%', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function BalanceCard({ label, amount }) {
  const isNeg = amount < 0
  return (
    <div style={{ ...S.card, padding: SP.lg }}>
      <CardHighlight />
      <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: C.tertiary, margin: `0 0 ${SP.sm}`, position: 'relative', zIndex: 1 }}>{label}</p>
      <p style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color: isNeg ? C.amber : C.primary, fontVariantNumeric: 'tabular-nums', margin: 0, position: 'relative', zIndex: 1 }}>
        {isNeg ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function SummaryCard({ title, rangeLabel, moneyIn, moneyOut, net }) {
  return (
    <div style={{ ...S.card, padding: SP.lg, display: 'flex', flexDirection: 'column', gap: SP.md }}>
      <CardHighlight />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: C.tertiary, margin: 0 }}>{title}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: '2px 0 0' }}>{rangeLabel}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: T.display.size, fontWeight: T.display.weight, letterSpacing: T.display.tracking, color: net < 0 ? C.amber : C.primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1, margin: 0 }}>
            {net < 0 ? '-' : '+'}{fmtK(net)}
          </p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: C.muted, margin: '2px 0 0' }}>Net</p>
        </div>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color: C.mint, fontVariantNumeric: 'tabular-nums', margin: 0 }}>+{fmtK(moneyIn)}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: C.muted, margin: '2px 0 0' }}>In</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color: C.amber, fontVariantNumeric: 'tabular-nums', margin: 0 }}>-{fmtK(moneyOut)}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: C.muted, margin: '2px 0 0' }}>Out</p>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx, onEdit }) {
  const isPos = Number(tx.amount) >= 0
  const [pressed, setPressed] = useState(false)
  const color = isPos ? C.mint : C.amber
  const tintBg = isPos
    ? `linear-gradient(160deg, rgba(79,255,176,${pressed ? '0.12' : '0.08'}) 0%, rgba(79,255,176,0.03) 100%)`
    : `linear-gradient(160deg, rgba(255,176,50,${pressed ? '0.12' : '0.08'}) 0%, rgba(255,176,50,0.03) 100%)`
  const tintBorder = isPos ? 'rgba(79,255,176,0.14)' : 'rgba(255,176,50,0.14)'
  const tintHL = isPos ? 'rgba(79,255,176,0.2)' : 'rgba(255,176,50,0.2)'
  const barTop = isPos ? '#7fffcc' : '#ffd080'

  return (
    <div
      onClick={() => onEdit(tx)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ display: 'flex', alignItems: 'center', gap: SP.md, padding: '13px 14px', borderRadius: R.md, background: tintBg, border: `1px solid ${tintBorder}`, boxShadow: `inset 0 1px 0 ${tintHL}`, marginBottom: '4px', transition: 'background 0.1s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: `linear-gradient(90deg, transparent, ${tintHL}, transparent)` }} />
      <div style={{ width: '3px', height: '30px', borderRadius: '2px', flexShrink: 0, background: `linear-gradient(180deg, ${barTop}, ${color})` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: C.primary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</p>
        <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.tertiary, margin: '3px 0 0' }}>{tx.account_name}</p>
      </div>
      <span style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color, fontVariantNumeric: 'tabular-nums' }}>
        {isPos ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

function DateGroup({ dateLabel, txs, onEdit, showDailyNet = false }) {
  const net = getDailyNet(txs)
  const isPos = net >= 0
  return (
    <div style={{ marginBottom: SP.xl }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: `0 2px ${SP.sm}` }}>
        <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: C.tertiary, margin: 0 }}>{dateLabel}</p>
        {showDailyNet && (
          <span style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: isPos ? 'rgba(79,255,176,0.55)' : 'rgba(255,176,50,0.55)', fontVariantNumeric: 'tabular-nums' }}>
            {isPos ? '+' : '-'}{fmt(net)}
          </span>
        )}
      </div>
      {txs.map(tx => <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} />)}
    </div>
  )
}

// ── MODAL ──────────────────────────────────────────────────────
function TransactionModal({ mode, tx, accounts, onSave, onDelete, onClose }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    date: tx?.date ?? todayStr(),
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
    try { await onSave({ ...form, amount, account_id: parseInt(form.account_id) }); onClose() }
    catch { setError('Something went wrong. Try again.'); setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    try { await onDelete(tx.id); onClose() }
    catch { setError('Could not delete. Try again.'); setLoading(false) }
  }

  const inputStyle = {
    ...S.input,
    width: '100%', color: C.primary,
    fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking,
    padding: '14px 16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking,
    color: C.tertiary, marginBottom: SP.sm,
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,12,0.80)', padding: SP.xl }}>
      <div style={{ width: '100%', maxWidth: '400px', ...S.modal, padding: '28px 24px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Highlights */}
        <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.50), transparent)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)', borderRadius: '24px 24px 0 0', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 60%)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.xl, position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: C.primary, margin: 0 }}>
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
            {isEdit && (
              <button onClick={handleDelete} style={{ width: '34px', height: '34px', borderRadius: '50%', background: confirmDelete ? 'rgba(255,176,50,0.2)' : 'rgba(255,176,50,0.08)', border: `1px solid ${confirmDelete ? 'rgba(255,176,50,0.5)' : 'rgba(255,176,50,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={confirmDelete ? C.amber : 'rgba(255,176,50,0.7)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: C.tertiary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, position: 'relative', zIndex: 1 }}>
          <div>
            <label style={labelStyle}>Description</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
              <input autoFocus style={inputStyle} placeholder="e.g. Lunch, Client Payment" value={form.description} onChange={e => set('description', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Amount — positive = in, negative = out</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', zIndex: 1 }} />
              <input type="number" step="any" style={inputStyle} placeholder="e.g. 5000 or -250" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.md }}>
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

        {error && <p style={{ fontSize: T.eyebrow.size, color: C.amber, margin: `${SP.md} 0 0`, fontWeight: 500, position: 'relative', zIndex: 1 }}>{error}</p>}
        {confirmDelete && !error && <p style={{ fontSize: T.eyebrow.size, color: C.amber, margin: `${SP.md} 0 0`, fontWeight: 500, position: 'relative', zIndex: 1 }}>Tap the trash icon again to confirm.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', marginTop: SP.xl, position: 'relative', zIndex: 1,
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(180deg, #ffffff 0%, #ebebeb 100%)',
            border: 'none', borderRadius: R.sm,
            color: loading ? 'rgba(0,0,0,0.3)' : C.base,
            fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking,
            padding: '16px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', overflow: 'hidden',
            boxShadow: loading ? 'none' : 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.15s',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'rgba(255,255,255,1)' }} />
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}

// ── BOTTOM BAR ─────────────────────────────────────────────────
function BottomBar({ screen, setScreen, onAdd }) {
  const [addPressed, setAddPressed] = useState(false)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: `linear-gradient(180deg, transparent 0%, ${C.base} 38%)`,
      paddingBottom: '28px',
    }}>
      <div style={{
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px',
      }}>
        {/* Dashboard — bare icon, no box */}
        <button
          onClick={() => setScreen('dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={screen === 'dashboard' ? C.primary : C.muted}>
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>

        {/* Add — glossy circle, 68px */}
        <button
          onClick={onAdd}
          onMouseDown={() => setAddPressed(true)}
          onMouseUp={() => setAddPressed(false)}
          onMouseLeave={() => setAddPressed(false)}
          onTouchStart={() => setAddPressed(true)}
          onTouchEnd={() => setAddPressed(false)}
          style={{
            width: '68px', height: '68px', borderRadius: '50%', flexShrink: 0,
            background: addPressed
              ? 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)'
              : 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(255,255,255,0.26)',
            color: C.primary, fontSize: '30px', fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.5)',
            transition: 'background 0.1s', position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)', borderRadius: '50% 50% 0 0' }} />
          +
        </button>

        {/* History — bare icon, no box */}
        <button
          onClick={() => setScreen('history')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" stroke={screen === 'history' ? C.primary : C.muted}>
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── APP ────────────────────────────────────────────────────────
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

  const weekly = getWeeklySummary(transactions)
  const monthly = getMonthlySummary(transactions)
  const recent = transactions.slice(0, 7)
  const recentGrouped = groupByDate(recent)
  const allGrouped = groupByDate(transactions)

  return (
    <div style={{ minHeight: '100vh', background: C.base, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.primary }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: #16161f; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        * { box-sizing: border-box; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 500px 600px at 50% 5%, rgba(20,180,140,0.20) 0%, transparent 65%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,200,120,0.07) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: `${SP['2xl']} ${SP.xl} 140px` }}>

        {/* ── DASHBOARD ── */}
        {screen === 'dashboard' && (
          <>
            {/* Hero zone */}
            <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: `0 0 ${SP.sm}` }}>{todayLabel()}</p>
            {loading
              ? <div style={{ height: '36px', width: '55%', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', marginBottom: SP.sm, animation: 'pulse 1.5s ease-in-out infinite' }} />
              : <h1 style={{ fontSize: T.hero.size, fontWeight: T.hero.weight, letterSpacing: T.hero.tracking, lineHeight: 1, margin: `0 0 4px`, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: (balances?.total ?? 0) < 0 ? C.amber : C.primary }}>
                    {(balances?.total ?? 0) < 0 ? '-' : ''}{fmt(balances?.total ?? 0)}
                  </span>
                </h1>
            }
            <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: C.secondary, margin: `0 0 4px` }}>Total Balance</p>
            <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: `0 0 ${SP.xl}` }}>Updated just now</p>

            {error && <div style={{ background: 'rgba(255,176,50,0.1)', border: '1px solid rgba(255,176,50,0.3)', color: C.amber, fontSize: T.eyebrow.size, fontWeight: 500, borderRadius: R.sm, padding: `${SP.md} ${SP.lg}`, marginBottom: SP.lg }}>{error}</div>}

            {/* Account cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.sm }}>
              {loading ? <><SkeletonCard /><SkeletonCard /></> : balances?.accounts.map(a => <BalanceCard key={a.id} label={a.name} amount={a.balance} />)}
            </div>

            {/* Weekly summary */}
            {!loading && <SummaryCard title="This Week" rangeLabel={weekly.rangeLabel} moneyIn={weekly.moneyIn} moneyOut={weekly.moneyOut} net={weekly.net} />}

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: `${SP.xl} 0` }} />

            {/* Recent transactions */}
            <p style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: C.secondary, margin: `0 0 ${SP.lg}` }}>Recent</p>

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, color: C.muted, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(recentGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={false} />)
            }
          </>
        )}

        {/* ── HISTORY ── */}
        {screen === 'history' && (
          <>
            <div style={{ marginBottom: SP.xl }}>
              <p style={{ fontSize: T.pageTitle.size, fontWeight: T.pageTitle.weight, letterSpacing: T.pageTitle.tracking, color: C.primary, margin: `0 0 4px` }}>All Transactions</p>
              <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: 0 }}>
                {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} · {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {!loading && <SummaryCard title="This Month" rangeLabel={monthly.monthLabel} moneyIn={monthly.moneyIn} moneyOut={monthly.moneyOut} net={monthly.net} />}

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: `${SP.lg} 0 ${SP.xl}` }} />

            {!loading && transactions.length === 0
              ? <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, color: C.muted, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
              : Object.entries(allGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={true} />)
            }
          </>
        )}
      </div>

      <BottomBar screen={screen} setScreen={setScreen} onAdd={() => setModal({ mode: 'add' })} />

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
