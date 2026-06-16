import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { getBalances, getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction, getRecurring, createRecurring, updateRecurring, deleteRecurring, getRecurringLogs, createRecurringLog, deleteRecurringLog } from './api'

// ── THEME CONTEXT ──────────────────────────────────────────────
const ThemeCtx = createContext(false)
const useMono = () => useContext(ThemeCtx)


// ── SHEET ANIMATION HOOK ───────────────────────────────────────
function useSheetAnimation(closing) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  const visible = mounted && !closing
  const overlayBg = visible ? 'rgba(5,5,12,0.80)' : 'rgba(5,5,12,0)'
  const sheetTransform = visible ? 'translateY(0)' : 'translateY(110%)'
  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: overlayBg, overflowY: 'hidden',
    touchAction: 'none', overscrollBehavior: 'none',
    transition: 'background 0.3s ease',
    padding: '0 0 16px',
  }
  const sheetStyle = {
    transform: sheetTransform,
    transition: 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
  }
  return { overlayStyle, sheetStyle }
}
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

// Dark mode colors
const CD = {
  primary:   'rgba(255,255,255,1.0)',
  secondary: 'rgba(255,255,255,0.55)',
  tertiary:  'rgba(255,255,255,0.30)',
  muted:     'rgba(255,255,255,0.18)',
  mint:      '#4fffb0',
  amber:     '#ffb032',
  base:      '#0a0a0f',
}

// Mono mode colors
const CM = {
  primary:   '#1c1c1a',
  secondary: '#6b6b68',
  tertiary:  '#a8a8a4',
  muted:     '#c8c8c4',
  income:    '#1c1c1a',   // bold
  expense:   '#888886',   // regular
  base:      '#f7f6f3',
  inverted:  '#1c1c1a',   // for weekly/monthly card bg
  invertedText: '#f7f6f3',
  invertedMuted: '#5a5a56',
  invertedSecondary: '#8a8a86',
}

// Surfaces — dark
const SD = {
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
    background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '14px',
  },
}

// Surfaces — mono
const SM = {
  card: {
    background: '#ffffff',
    border: '1px solid #1c1c1a',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'none',
  },
  summaryCard: {
    background: '#1c1c1a',
    border: '1px solid #1c1c1a',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'none',
  },
  modal: {
    background: '#f7f6f3',
    border: '1px solid #1c1c1a',
    borderRadius: '24px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
  },
  input: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.18)',
    borderRadius: '14px',
  },
}

const R = { sm: '14px', md: '16px', lg: '20px', xl: '24px', pill: '999px' }
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

function SkeletonCard() {
  const mono = useMono()
  const bg = mono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
  const cardStyle = mono ? SM.card : SD.card
  return (
    <div style={{ ...cardStyle, padding: SP.lg }}>
      {!mono && <CardHighlight />}
      <div style={{ height: '12px', width: '40%', borderRadius: '6px', background: bg, marginBottom: '14px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '16px', width: '65%', borderRadius: '6px', background: bg, animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function BalanceCard({ label, amount }) {
  const mono = useMono()
  const C = mono ? CM : CD
  const cardStyle = mono ? SM.card : SD.card
  const isNeg = amount < 0
  const amtColor = mono ? C.primary : (isNeg ? C.amber : C.primary)
  return (
    <div style={{ ...cardStyle, padding: SP.lg }}>
      {!mono && <CardHighlight />}
      <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: C.tertiary, margin: `0 0 ${SP.sm}`, position: 'relative', zIndex: 1 }}>{label}</p>
      <p style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color: amtColor, fontVariantNumeric: 'tabular-nums', margin: 0, position: 'relative', zIndex: 1 }}>
        {isNeg ? '-' : ''}{fmt(amount)}
      </p>
    </div>
  )
}

function SummaryCard({ title, rangeLabel, moneyIn, moneyOut, net }) {
  const mono = useMono()
  const C = mono ? CM : CD
  const cardStyle = mono ? SM.summaryCard : SD.card
  // In mono, card is inverted (dark bg, light text)
  const titleColor = mono ? CM.invertedSecondary : C.tertiary
  const rangeColor = mono ? CM.invertedMuted : C.muted
  const netColor = mono ? CM.invertedText : (net < 0 ? C.amber : C.primary)
  const netLblColor = mono ? CM.invertedMuted : C.muted
  const divColor = mono ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.08)'
  const inColor = mono ? CM.invertedText : C.mint
  const inWeight = mono ? 700 : T.bodyStrong.weight
  const outColor = mono ? CM.expense : C.amber
  const outWeight = mono ? 400 : T.bodyStrong.weight
  const ioLblColor = mono ? CM.invertedMuted : C.muted

  return (
    <div style={{ ...cardStyle, padding: SP.lg, display: 'flex', flexDirection: 'column', gap: SP.md }}>
      {!mono && <CardHighlight />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: titleColor, margin: 0 }}>{title}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: rangeColor, margin: '2px 0 0' }}>{rangeLabel}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: T.display.size, fontWeight: mono ? 700 : T.display.weight, letterSpacing: T.display.tracking, color: netColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1, margin: 0 }}>
            {net < 0 ? '-' : '+'}{fmtK(net)}
          </p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: netLblColor, margin: '2px 0 0' }}>Net</p>
        </div>
      </div>
      <div style={{ height: '1px', background: divColor, position: 'relative', zIndex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: T.bodyStrong.size, fontWeight: inWeight, letterSpacing: T.bodyStrong.tracking, color: inColor, fontVariantNumeric: 'tabular-nums', margin: 0 }}>+{fmtK(moneyIn)}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: ioLblColor, margin: '2px 0 0' }}>In</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: T.bodyStrong.size, fontWeight: outWeight, letterSpacing: T.bodyStrong.tracking, color: outColor, fontVariantNumeric: 'tabular-nums', margin: 0 }}>-{fmtK(moneyOut)}</p>
          <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, color: ioLblColor, margin: '2px 0 0' }}>Out</p>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx, onEdit, isNew }) {
  const mono = useMono()
  const isPos = Number(tx.amount) >= 0
  const [pressed, setPressed] = useState(false)

  // Dark mode styles
  const darkColor = isPos ? CD.mint : CD.amber
  const darkTintBg = isPos
    ? `linear-gradient(160deg, rgba(79,255,176,${pressed ? '0.12' : '0.08'}) 0%, rgba(79,255,176,0.03) 100%)`
    : `linear-gradient(160deg, rgba(255,176,50,${pressed ? '0.12' : '0.08'}) 0%, rgba(255,176,50,0.03) 100%)`
  const darkBorder = isPos ? 'rgba(79,255,176,0.14)' : 'rgba(255,176,50,0.14)'
  const darkHL = isPos ? 'rgba(79,255,176,0.2)' : 'rgba(255,176,50,0.2)'
  const darkBarTop = isPos ? '#7fffcc' : '#ffd080'
  const darkBarBot = isPos ? CD.mint : CD.amber

  // Mono mode styles
  const monoBg = pressed ? (isPos ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)') : '#ffffff'
  const monoBorder = isPos ? '1px solid #1c1c1a' : '1px solid rgba(0,0,0,0.12)'
  const monoBar = isPos ? '#1c1c1a' : '#c8c8c4'
  const monoAmtColor = isPos ? CM.income : CM.expense
  const monoAmtWeight = isPos ? 700 : 400

  const newAnimation = isNew
    ? `txSlideIn 0.35s cubic-bezier(0.32, 0.72, 0, 1) both, ${isPos ? 'txGlowMint' : 'txGlowAmber'} 1.4s ease 0.35s both`
    : undefined

  const rowStyle = mono
    ? { display: 'flex', alignItems: 'center', gap: SP.md, padding: '13px 14px', borderRadius: R.md, background: monoBg, border: monoBorder, boxShadow: 'none', marginBottom: '4px', transition: 'background 0.1s', cursor: 'pointer', position: 'relative', overflow: 'hidden', animation: newAnimation }
    : { display: 'flex', alignItems: 'center', gap: SP.md, padding: '13px 14px', borderRadius: R.md, background: darkTintBg, border: `1px solid ${darkBorder}`, boxShadow: `inset 0 1px 0 ${darkHL}`, marginBottom: '4px', transition: 'background 0.1s', cursor: 'pointer', position: 'relative', overflow: 'hidden', animation: newAnimation }

  return (
    <div
      onClick={() => onEdit(tx)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={rowStyle}
    >
      {!mono && <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: `linear-gradient(90deg, transparent, ${darkHL}, transparent)` }} />}
      <div style={{ width: '3px', height: '30px', borderRadius: '2px', flexShrink: 0, background: mono ? monoBar : `linear-gradient(180deg, ${darkBarTop}, ${darkBarBot})` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: mono ? CM.primary : CD.primary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</p>
        <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: mono ? CM.tertiary : CD.tertiary, margin: '3px 0 0' }}>{tx.account_name}</p>
      </div>
      <span style={{ fontSize: T.bodyStrong.size, fontWeight: mono ? monoAmtWeight : T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, color: mono ? monoAmtColor : darkColor, fontVariantNumeric: 'tabular-nums' }}>
        {isPos ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

function DateGroup({ dateLabel, txs, onEdit, showDailyNet = false, newTxId }) {
  const mono = useMono()
  const net = getDailyNet(txs)
  const isPos = net >= 0
  const netColor = mono
    ? (isPos ? CM.income : CM.expense)
    : (isPos ? 'rgba(79,255,176,0.55)' : 'rgba(255,176,50,0.55)')
  const netWeight = mono ? (isPos ? 700 : 400) : T.eyebrow.weight

  return (
    <div style={{ marginBottom: SP.xl }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: `0 2px ${SP.sm}` }}>
        <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: mono ? CM.tertiary : CD.tertiary, margin: 0 }}>{dateLabel}</p>
        {showDailyNet && (
          <span style={{ fontSize: T.eyebrow.size, fontWeight: netWeight, color: netColor, fontVariantNumeric: 'tabular-nums' }}>
            {isPos ? '+' : '-'}{fmt(net)}
          </span>
        )}
      </div>
      {txs.map(tx => <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} isNew={tx.id === newTxId} />)}
    </div>
  )
}

// ── CALENDAR PICKER ────────────────────────────────────────────
function CalendarPicker({ value, onChange, open, onToggle }) {
  const mono = useMono()
  const parseDate = (str) => {
    const [y, m, d] = str.split('-').map(Number)
    return { year: y, month: m - 1, day: d }
  }
  const { year, month } = parseDate(value)
  const [viewYear, setViewYear] = useState(year)
  const [viewMonth, setViewMonth] = useState(month)

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()
  const today = todayStr()

  const toStr = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const formatDisplay = (str) => {
    const [y, m, d] = str.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return `${WEEKDAYS[date.getDay()]}, ${MONTHS_SHORT[m-1]} ${d}, ${y}`
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) }
    else setViewMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + i + 1, type: 'prev' })
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, type: 'cur' })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, type: 'next' })

  const handleDaySelect = (dateStr) => { onChange(dateStr); onToggle() }

  const inputStyle = mono
    ? { width: '100%', background: '#fff', border: open ? '1px solid #1c1c1a' : '1px solid rgba(0,0,0,0.18)', borderRadius: R.sm, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }
    : { width: '100%', background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)', border: open ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }

  const calBg = mono
    ? { background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: R.md, overflow: 'hidden', position: 'relative', marginTop: '8px' }
    : { background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: R.md, overflow: 'hidden', position: 'relative', marginTop: '8px' }

  const navBtnStyle = mono
    ? { width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)', color: CM.secondary, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    : { width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: CD.secondary, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  return (
    <div>
      <button onClick={onToggle} style={inputStyle}>
        <span style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: mono ? CM.primary : CD.primary, position: 'relative', zIndex: 1 }}>{formatDisplay(value)}</span>
        <span style={{ fontSize: '11px', color: mono ? CM.muted : CD.muted, position: 'relative', zIndex: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      {open && (
        <div style={calBg}>
          {!mono && <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)' }} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px' }}>
            <span style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.primary : CD.primary, letterSpacing: T.label.tracking }}>{MONTHS[viewMonth]} {viewYear}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['‹', prevMonth], ['›', nextMonth]].map(([icon, fn]) => (
                <button key={icon} onClick={fn} style={navBtnStyle}>{icon}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px', marginBottom: '4px' }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: mono ? CM.muted : CD.muted, padding: '2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', padding: '0 8px 10px' }}>
            {cells.map((cell, i) => {
              const dateStr = cell.type === 'cur' ? toStr(viewYear, viewMonth, cell.day)
                : cell.type === 'prev' ? toStr(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1, cell.day)
                : toStr(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1, cell.day)
              const isSelected = dateStr === value
              const isToday = dateStr === today
              const isCur = cell.type === 'cur'
              const textColor = mono
                ? (isSelected ? '#f7f6f3' : isToday ? CM.primary : isCur ? CM.secondary : CM.muted)
                : (isSelected ? CD.base : isToday ? CD.primary : isCur ? CD.secondary : CD.muted)
              const bg = mono
                ? (isSelected ? '#1c1c1a' : isToday ? 'rgba(0,0,0,0.08)' : 'transparent')
                : (isSelected ? CD.primary : isToday ? 'rgba(255,255,255,0.12)' : 'transparent')
              return (
                <div key={i} onClick={() => handleDaySelect(dateStr)} style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', fontWeight: isSelected ? 700 : isToday ? 600 : 500, color: textColor, background: bg, transition: 'background 0.1s' }}>
                  {cell.day}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MODAL ──────────────────────────────────────────────────────
function TransactionModal({ mode, tx, accounts, onSave, onDelete, onClose, closing, prefill = {} }) {
  const mono = useMono()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    date: tx?.date ?? prefill.date ?? todayStr(),
    description: tx?.description ?? prefill.description ?? '',
    amount: tx ? String(tx.amount) : (prefill.amount ?? ''),
    account_id: tx?.account_id ?? prefill.account_id ?? accounts[0]?.id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const { overlayStyle, sheetStyle } = useSheetAnimation(closing)

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const cycleAccount = () => {
    const ids = accounts.map(a => a.id)
    const currentIndex = ids.indexOf(parseInt(form.account_id))
    const nextIndex = (currentIndex + 1) % ids.length
    set('account_id', ids[nextIndex])
  }

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

  const handleDateToggle = () => {
    if (document.activeElement) document.activeElement.blur()
    setCalOpen(o => !o)
  }

  const fieldBase = mono
    ? { width: '100%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.18)', borderRadius: R.sm, padding: '14px 16px', color: CM.primary, fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', WebkitAppearance: 'none', appearance: 'none' }
    : { width: '100%', background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, padding: '14px 16px', color: CD.primary, fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', WebkitAppearance: 'none', appearance: 'none' }

  const labelStyle = {
    display: 'block',
    fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking,
    color: mono ? CM.secondary : CD.tertiary, marginBottom: SP.sm,
  }

  const currentAccount = accounts.find(a => a.id === parseInt(form.account_id)) || accounts[0]

  const modalStyle = mono
    ? { width: '100%', maxWidth: '400px', ...SM.modal, padding: '20px 22px 22px', position: 'relative', overflow: 'hidden', ...sheetStyle }
    : { width: '100%', maxWidth: '400px', ...SD.modal, padding: '20px 22px 22px', position: 'relative', overflow: 'hidden', ...sheetStyle }

  const saveBtnStyle = {
    width: '100%', marginTop: SP.xl, position: 'relative', zIndex: 1,
    background: loading ? (mono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)') : (mono ? '#1c1c1a' : 'linear-gradient(180deg, #ffffff 0%, #ebebeb 100%)'),
    border: 'none', borderRadius: R.pill,
    color: loading ? (mono ? CM.muted : 'rgba(0,0,0,0.3)') : (mono ? '#f7f6f3' : CD.base),
    fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking,
    padding: '16px', cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', overflow: 'hidden',
    boxShadow: (loading || mono) ? 'none' : 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.3)',
    transition: 'background 0.15s',
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onTouchMove={(e) => e.preventDefault()} style={overlayStyle}>
      <div style={modalStyle}>
        {/* Drag handle */}
        <div style={{ width: '36px', height: '4px', background: mono ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 16px' }} />

        {/* Dark mode highlights */}
        {!mono && <>
          <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.50), transparent)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)', borderRadius: '24px 24px 0 0', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 60%)' }} />
        </>}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.xl, position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: mono ? CM.primary : CD.primary, margin: 0 }}>
            {isEdit ? 'Edit Entry' : 'New Entry'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
            {isEdit && (
              <button onClick={handleDelete} style={{ width: '34px', height: '34px', borderRadius: '50%', background: confirmDelete ? (mono ? 'rgba(0,0,0,0.08)' : 'rgba(255,176,50,0.2)') : (mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,176,50,0.08)'), border: confirmDelete ? (mono ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(255,176,50,0.5)') : (mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,176,50,0.2)'), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={mono ? CM.secondary : (confirmDelete ? CD.amber : 'rgba(255,176,50,0.7)')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', color: mono ? CM.secondary : CD.tertiary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, position: 'relative', zIndex: 1 }}>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={fieldBase} placeholder="e.g. Lunch, Client Payment" value={form.description} onChange={e => set('description', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
            <input type="number" step="any" style={fieldBase} placeholder="+ Income  /  − Expense" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <div style={{ height: '1px', background: mono ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)', margin: '-4px 0' }} />

          <div>
            <label style={labelStyle}>Account</label>
            <button onClick={cycleAccount} style={{ ...fieldBase, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', overflow: 'hidden' }}>
              <span style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: mono ? CM.primary : CD.primary }}>{currentAccount?.name}</span>
              <span style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.muted : CD.muted }}>↻</span>
            </button>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <CalendarPicker value={form.date} onChange={v => set('date', v)} open={calOpen} onToggle={handleDateToggle} />
          </div>
        </div>

        {error && <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.secondary : CD.amber, margin: `${SP.md} 0 0`, fontWeight: 500, position: 'relative', zIndex: 1 }}>{error}</p>}
        {confirmDelete && !error && <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.secondary : CD.amber, margin: `${SP.md} 0 0`, fontWeight: 500, position: 'relative', zIndex: 1 }}>Tap the trash icon again to confirm.</p>}

        <button onClick={handleSubmit} disabled={loading} style={saveBtnStyle}>
          {!mono && <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'rgba(255,255,255,1)' }} />}
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}

// ── RECURRING HELPERS ──────────────────────────────────────────
function getRecurringStatus(entry, logs, today) {
  const now = new Date(today)
  const day = now.getDate()
  const log = logs.find(l => l.recurring_id === entry.id)
  if (log) return log.status
  const dueDay = entry.day_of_month
  if (dueDay === day) return 'due'
  if (dueDay > day && dueDay - day <= 3) return 'upcoming'
  if (dueDay < day) return 'overdue'
  return 'future'
}
function getDaysUntil(entry, today) {
  const now = new Date(today)
  return entry.day_of_month - now.getDate()
}
function getDaysOverdue(entry, today) {
  const now = new Date(today)
  return now.getDate() - entry.day_of_month
}


// ── RECURRING FORM SHEET ───────────────────────────────────────
function RecurringForm({ entry, accounts, onSave, onClose, closing }) {
  const mono = useMono()
  const isEdit = !!entry
  const [form, setForm] = useState({
    name: entry?.name ?? '',
    amount: entry ? String(Math.abs(entry.amount)) : '',
    account_id: entry?.account_id ?? accounts[0]?.id ?? '',
    day_of_month: entry?.day_of_month ?? new Date().getDate(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { overlayStyle, sheetStyle } = useSheetAnimation(closing)

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cycleAccount = () => {
    const ids = accounts.map(a => a.id)
    const idx = ids.indexOf(parseInt(form.account_id))
    set('account_id', ids[(idx + 1) % ids.length])
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError('Enter a positive amount.'); return }
    const day = parseInt(form.day_of_month)
    if (isNaN(day) || day < 1 || day > 31) { setError('Enter a valid day (1–31).'); return }
    setLoading(true); setError('')
    try {
      await onSave({ ...form, amount: -Math.abs(amount), account_id: parseInt(form.account_id), day_of_month: day })
      onClose()
    } catch { setError('Something went wrong. Try again.'); setLoading(false) }
  }

  const fieldBase = mono
    ? { width: '100%', background: '#fff', border: '1px solid rgba(0,0,0,0.18)', borderRadius: R.sm, padding: '14px 16px', color: CM.primary, fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
    : { width: '100%', background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, padding: '14px 16px', color: CD.primary, fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: T.label.size, fontWeight: T.label.weight, letterSpacing: T.label.tracking, color: mono ? CM.secondary : CD.tertiary, marginBottom: SP.sm }
  const modalBg = mono ? SM.modal.background : SD.modal.background
  const modalBorder = mono ? SM.modal.border : SD.modal.border
  const modalShadow = mono ? SM.modal.boxShadow : SD.modal.boxShadow
  const currentAccount = accounts.find(a => a.id === parseInt(form.account_id)) || accounts[0]

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onTouchMove={(e) => e.preventDefault()} style={overlayStyle}>
      <div style={{ width: '100%', maxWidth: '400px', background: modalBg, border: modalBorder, borderRadius: '24px 24px 0 0', boxShadow: modalShadow, padding: '12px 22px 28px', position: 'relative', overflow: 'hidden', ...sheetStyle }}>
        <div style={{ width: '36px', height: '4px', background: mono ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 16px' }} />
        {!mono && <>
          <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.50), transparent)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 60%)' }} />
        </>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.xl, position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: mono ? CM.primary : CD.primary, margin: 0 }}>{isEdit ? 'Edit recurring' : 'New recurring'}</h2>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', color: mono ? CM.secondary : CD.tertiary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, position: 'relative', zIndex: 1 }}>
          <div><label style={labelStyle}>Name</label><input autoFocus style={fieldBase} placeholder="e.g. Netflix, Maya Subscription" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label style={labelStyle}>Monthly amount</label><input type="number" step="any" style={fieldBase} placeholder="e.g. 299" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
          <div style={{ height: '1px', background: mono ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)', margin: '-4px 0' }} />
          <div><label style={labelStyle}>Account</label>
            <button onClick={cycleAccount} style={{ ...fieldBase, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span>{currentAccount?.name}</span><span style={{ fontSize: T.label.size, color: mono ? CM.muted : CD.muted }}>↻</span>
            </button>
          </div>
          <div><label style={labelStyle}>Day of month</label><input type="number" min="1" max="31" style={fieldBase} placeholder="e.g. 16" value={form.day_of_month} onChange={e => set('day_of_month', e.target.value)} /></div>
        </div>
        {error && <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.secondary : CD.amber, margin: `${SP.md} 0 0`, fontWeight: 500, position: 'relative', zIndex: 1 }}>{error}</p>}
        <button onClick={handleSave} disabled={loading} style={{ width: '100%', marginTop: SP.xl, position: 'relative', zIndex: 1, background: loading ? 'rgba(255,255,255,0.1)' : (mono ? '#1c1c1a' : 'linear-gradient(180deg, #ffffff 0%, #ebebeb 100%)'), border: 'none', borderRadius: R.pill, color: loading ? 'rgba(0,0,0,0.3)' : (mono ? '#f7f6f3' : CD.base), fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, letterSpacing: T.bodyStrong.tracking, padding: '16px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', overflow: 'hidden', boxShadow: (loading || mono) ? 'none' : 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.3)', transition: 'background 0.15s' }}>
          {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Add recurring'}
        </button>
      </div>
    </div>
  )
}

// ── RECURRING DETAIL SHEET ─────────────────────────────────────
function RecurringSheet({ entry, status, accounts, onLog, onSkip, onEdit, onCancel, onClose, closing }) {
  const mono = useMono()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { overlayStyle, sheetStyle } = useSheetAnimation(closing)

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const modalBg = mono ? SM.modal.background : SD.modal.background
  const modalBorder = mono ? SM.modal.border : SD.modal.border
  const detailBg = mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
  const detailBorder = mono ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)'
  const detailDivider = mono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
  const badge = status === 'due' ? { label: 'Due today', color: '#ffb032', bg: 'rgba(255,176,50,0.15)', border: 'rgba(255,176,50,0.25)' }
    : status === 'overdue' ? { label: 'Overdue', color: 'rgba(255,100,100,0.90)', bg: 'rgba(255,80,80,0.12)', border: 'rgba(255,80,80,0.25)' }
    : status === 'logged' ? { label: 'Logged', color: '#4fffb0', bg: 'rgba(79,255,176,0.12)', border: 'rgba(79,255,176,0.25)' }
    : status === 'skipped' ? { label: 'Skipped', color: 'rgba(255,255,255,0.40)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' }
    : { label: 'Upcoming', color: 'rgba(255,255,255,0.40)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' }
  const showLog = status === 'due' || status === 'overdue'
  const showSkip = status === 'due' || status === 'overdue'
  const showUndo = status === 'logged' || status === 'skipped'
  const suffix = (d) => d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
  const nextDueDate = () => new Date(year, month - 1, entry.day_of_month).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  const lastLogged = () => new Date(year, month - 2, entry.day_of_month).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  const secBtn = { height: '48px', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)', borderRadius: R.sm, fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.secondary : CD.tertiary, cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onTouchMove={(e) => e.preventDefault()} style={overlayStyle}>
      <div style={{ width: '100%', maxWidth: '400px', background: modalBg, border: modalBorder, borderRadius: '24px 24px 0 0', padding: '12px 20px 40px', position: 'relative', overflow: 'hidden', ...sheetStyle }}>
        <div style={{ width: '36px', height: '4px', background: mono ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 18px' }} />
        {!mono && <>
          <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.50), transparent)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 60%)' }} />
        </>}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: mono ? CM.primary : CD.primary, margin: 0 }}>{entry.name}</p>
            <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.tertiary : CD.tertiary, margin: '3px 0 0' }}>Monthly recurring · {entry.account_name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: T.display.size, fontWeight: T.display.weight, letterSpacing: T.display.tracking, color: mono ? CM.expense : CD.amber, fontVariantNumeric: 'tabular-nums', lineHeight: 1, margin: 0 }}>{fmt(entry.amount)}</p>
              <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.muted : CD.muted, margin: '2px 0 0' }}>per month</p>
            </div>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '50%', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.10)', color: mono ? CM.secondary : CD.tertiary, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>
        <div style={{ background: detailBg, border: detailBorder, borderRadius: R.md, overflow: 'hidden', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          {[['Status', <span style={{ fontSize: '9px', fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '6px', padding: '2px 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{badge.label}</span>], ['Next due', nextDueDate()], ['Repeats', `Monthly · ${entry.day_of_month}${suffix(entry.day_of_month)}`], ['Account', entry.account_name], ['Last logged', lastLogged()]].map(([lbl, val], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: i < 4 ? `1px solid ${detailDivider}` : 'none' }}>
              <span style={{ fontSize: T.eyebrow.size, color: mono ? CM.tertiary : CD.muted }}>{lbl}</span>
              {typeof val === 'string' ? <span style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.primary : CD.secondary }}>{val}</span> : val}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
          {confirmCancel ? (<>
            <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.20)', borderRadius: R.md, padding: '14px', marginBottom: '4px' }}>
              <p style={{ fontSize: T.body.size, fontWeight: 600, color: mono ? CM.primary : CD.primary, margin: '0 0 6px' }}>Remove this recurring entry?</p>
              <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.secondary : CD.tertiary, margin: 0, lineHeight: 1.5 }}>{entry.name} will be removed. Past logged transactions won't be affected.</p>
            </div>
            <button onClick={onCancel} style={{ width: '100%', height: '48px', background: 'rgba(255,80,80,0.80)', border: 'none', borderRadius: R.pill, fontSize: T.body.size, fontWeight: T.bodyStrong.weight, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Yes, remove it</button>
            <button onClick={() => setConfirmCancel(false)} style={{ width: '100%', ...secBtn }}>Keep it</button>
          </>) : (<>
            {showLog && <button onClick={onLog} style={{ width: '100%', height: '48px', background: mono ? '#1c1c1a' : 'linear-gradient(180deg, #fff 0%, #ebebeb 100%)', border: 'none', borderRadius: R.pill, fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, color: mono ? '#f7f6f3' : CD.base, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden', boxShadow: mono ? 'none' : 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.3)' }}>Log this month</button>}
            {showUndo && <button onClick={onLog} style={{ width: '100%', ...secBtn }}>Undo — mark as {status === 'logged' ? 'not logged' : 'not skipped'}</button>}
            <div style={{ display: 'flex', gap: '8px' }}>
              {showSkip && <button onClick={onSkip} style={{ flex: 1, ...secBtn }}>Not this month</button>}
              <button onClick={onEdit} style={{ flex: 1, ...secBtn }}>Edit</button>
            </div>
            <div style={{ borderTop: mono ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.07)', marginTop: '6px', paddingTop: '14px' }}>
              <button onClick={() => setConfirmCancel(true)} style={{ width: '100%', height: '48px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,80,80,0.22)', borderRadius: R.sm, fontSize: T.label.size, fontWeight: T.label.weight, color: 'rgba(255,80,80,0.70)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel subscription</button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── RECURRING BANNER ───────────────────────────────────────────
function RecurringBanner({ entry, status, onLog, onSkip, onTap, today }) {
  const mono = useMono()
  const daysOverdue = getDaysOverdue(entry, today)
  const daysUntil = getDaysUntil(entry, today)
  if (status === 'due') return (
    <div onClick={onTap} style={{ background: mono ? 'rgba(0,0,0,0.06)' : 'linear-gradient(160deg, rgba(255,176,50,0.12) 0%, rgba(255,176,50,0.05) 100%)', border: mono ? '1px solid rgba(0,0,0,0.14)' : '1px solid rgba(255,176,50,0.28)', borderRadius: R.lg, padding: '13px 14px', marginBottom: '10px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
      {!mono && <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,176,50,0.35), transparent)' }} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div><p style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.primary : CD.primary, margin: 0 }}>↻ {entry.name}</p><p style={{ fontSize: T.eyebrow.size, color: mono ? CM.tertiary : CD.muted, margin: '2px 0 0' }}>Monthly · {entry.account_name} · Due today</p></div>
        <span style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, color: mono ? CM.expense : CD.amber, fontVariantNumeric: 'tabular-nums' }}>{fmt(entry.amount)}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onLog} style={{ flex: 1, height: '38px', background: mono ? '#1c1c1a' : '#ffb032', border: 'none', borderRadius: R.pill, fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? '#f7f6f3' : '#0a0a0f', cursor: 'pointer', fontFamily: 'inherit' }}>Log it</button>
        <button onClick={onSkip} style={{ flex: 1, height: '38px', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.secondary : CD.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Not this month</button>
      </div>
    </div>
  )
  if (status === 'overdue') return (
    <div onClick={onTap} style={{ background: 'linear-gradient(160deg, rgba(255,80,80,0.10) 0%, rgba(255,80,80,0.04) 100%)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: R.lg, padding: '13px 14px', marginBottom: '10px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,80,80,0.30), transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div><p style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.primary : CD.primary, margin: 0 }}>↻ {entry.name}</p><p style={{ fontSize: T.eyebrow.size, color: 'rgba(255,100,100,0.70)', margin: '2px 0 0' }}>{daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue · was due {entry.day_of_month}th</p></div>
        <span style={{ fontSize: T.bodyStrong.size, fontWeight: T.bodyStrong.weight, color: 'rgba(255,100,100,0.90)', fontVariantNumeric: 'tabular-nums' }}>{fmt(entry.amount)}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onLog} style={{ flex: 1, height: '38px', background: 'rgba(255,80,80,0.80)', border: 'none', borderRadius: R.pill, fontSize: T.label.size, fontWeight: T.label.weight, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Log it now</button>
        <button onClick={onSkip} style={{ flex: 1, height: '38px', background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.secondary : CD.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Not this month</button>
      </div>
    </div>
  )
  if (status === 'upcoming') return (
    <div onClick={onTap} style={{ background: mono ? 'rgba(0,0,0,0.04)' : 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: mono ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.10)', borderRadius: R.lg, padding: '13px 14px', marginBottom: '10px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><p style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.secondary : 'rgba(255,255,255,0.60)', margin: 0 }}>↻ {entry.name}</p><p style={{ fontSize: T.eyebrow.size, color: mono ? CM.tertiary : CD.muted, margin: '2px 0 0' }}>Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'} · {entry.account_name}</p></div>
        <span style={{ fontSize: T.bodyStrong.size, fontWeight: T.body.weight, color: mono ? CM.tertiary : CD.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(entry.amount)}</span>
      </div>
    </div>
  )
  return null
}

// ── RECURRING SECTION ──────────────────────────────────────────
function RecurringSection({ entries, logs, today, onAdd, onTapEntry }) {
  const mono = useMono()
  const cardBg = mono ? '#fff' : 'rgba(255,255,255,0.04)'
  const cardBorder = mono ? '1px solid rgba(0,0,0,0.14)' : '1px solid rgba(255,255,255,0.10)'
  const divColor = mono ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'
  const itemDiv = mono ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
  const suffix = (d) => d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
  const badgeFor = (status) => {
    if (status === 'due') return { label: 'Today', color: '#ffb032', bg: 'rgba(255,176,50,0.15)', border: 'rgba(255,176,50,0.25)' }
    if (status === 'overdue') return { label: 'Overdue', color: 'rgba(255,100,100,0.90)', bg: 'rgba(255,80,80,0.12)', border: 'rgba(255,80,80,0.25)' }
    if (status === 'logged') return { label: 'Logged', color: mono ? CM.secondary : '#4fffb0', bg: mono ? 'rgba(0,0,0,0.06)' : 'rgba(79,255,176,0.12)', border: mono ? 'rgba(0,0,0,0.12)' : 'rgba(79,255,176,0.25)' }
    if (status === 'skipped') return { label: 'Skipped', color: mono ? CM.muted : CD.muted, bg: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)' }
    const now = new Date(today)
    const nextMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    return { label: `${nextMonth.toLocaleDateString('en-PH', { month: 'short' })} ${entries[0]?.day_of_month ?? ''}`, color: mono ? CM.muted : CD.muted, bg: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)' }
  }
  return (
    <div style={{ background: cardBg, border: cardBorder, borderRadius: R.lg, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SP.md} ${SP.lg}` }}>
        <span style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.tertiary : CD.tertiary, letterSpacing: T.label.tracking }}>Recurring</span>
        <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 300, color: mono ? CM.tertiary : CD.tertiary, fontFamily: 'inherit', padding: '0 0 0 8px' }}>+</button>
      </div>
      <div style={{ height: '1px', background: divColor }} />
      {entries.length === 0 ? (
        <div style={{ padding: `${SP.xl} ${SP.lg}`, textAlign: 'center' }}>
          <p style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.muted : CD.muted, margin: `0 0 ${SP.md}` }}>No recurring entries yet</p>
          <button onClick={onAdd} style={{ fontSize: T.label.size, fontWeight: T.label.weight, color: mono ? CM.secondary : CD.tertiary, background: mono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', border: mono ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', borderRadius: R.sm, padding: `${SP.sm} ${SP.lg}`, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add recurring</button>
        </div>
      ) : entries.map((entry, i) => {
        const status = getRecurringStatus(entry, logs, today)
        const badge = badgeFor(status)
        const amtColor = mono ? (status === 'logged' ? CM.secondary : CM.expense) : (status === 'logged' ? CD.muted : CD.amber)
        return (
          <div key={entry.id} onClick={() => onTapEntry(entry)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SP.md} ${SP.lg}`, borderBottom: i < entries.length - 1 ? `1px solid ${itemDiv}` : 'none', cursor: 'pointer' }}>
            <div>
              <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, color: mono ? CM.primary : CD.secondary, margin: 0 }}>{entry.name}</p>
              <p style={{ fontSize: T.eyebrow.size, color: mono ? CM.tertiary : CD.muted, margin: '2px 0 0' }}>Monthly · {entry.day_of_month}{suffix(entry.day_of_month)} · {entry.account_name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '6px', padding: '2px 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{badge.label}</span>
              <span style={{ fontSize: T.label.size, fontWeight: status === 'logged' ? 400 : 600, color: amtColor, fontVariantNumeric: 'tabular-nums' }}>{fmt(entry.amount)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ── BOTTOM BAR ─────────────────────────────────────────────────
function BottomBar({ screen, setScreen, onAdd }) {
  const mono = useMono()
  const [addPressed, setAddPressed] = useState(false)

  const fabStyle = mono
    ? { width: '68px', height: '68px', borderRadius: '50%', flexShrink: 0, background: addPressed ? '#333330' : '#1c1c1a', border: 'none', color: '#f7f6f3', fontSize: '30px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', boxShadow: 'none', transition: 'background 0.1s', position: 'relative' }
    : { width: '68px', height: '68px', borderRadius: '50%', flexShrink: 0, background: addPressed ? 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)' : 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(255,255,255,0.26)', color: CD.primary, fontSize: '30px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.5)', transition: 'background 0.1s', position: 'relative' }

  const dashColor = screen === 'dashboard' ? (mono ? CM.primary : CD.primary) : (mono ? CM.muted : CD.muted)
  const histColor = screen === 'history' ? (mono ? CM.primary : CD.primary) : (mono ? CM.muted : CD.muted)
  const navBg = mono ? `linear-gradient(180deg, transparent 0%, ${CM.base} 38%)` : `linear-gradient(180deg, transparent 0%, ${CD.base} 38%)`

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: navBg, paddingBottom: '28px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <button onClick={() => setScreen('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={dashColor}>
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button onClick={onAdd} onMouseDown={() => setAddPressed(true)} onMouseUp={() => setAddPressed(false)} onMouseLeave={() => setAddPressed(false)} onTouchStart={() => setAddPressed(true)} onTouchEnd={() => setAddPressed(false)} style={fabStyle}>
          {!mono && <>
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.70), transparent)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)', borderRadius: '50% 50% 0 0' }} />
          </>}
          +
        </button>
        <button onClick={() => setScreen('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" stroke={histColor}>
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
  const [modalClosing, setModalClosing] = useState(false)
  const [screen, setScreen] = useState('dashboard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [newTxId, setNewTxId] = useState(null)
  const [recurring, setRecurring] = useState([])
  const [recurringLogs, setRecurringLogs] = useState([])
  const [recurringSheet, setRecurringSheet] = useState(null)
  const [recurringSheetClosing, setRecurringSheetClosing] = useState(false)
  const [recurringForm, setRecurringForm] = useState(null)
  const [recurringFormClosing, setRecurringFormClosing] = useState(false)
  const [mono, setMono] = useState(() => {
    try { return localStorage.getItem('theme') === 'mono' } catch { return false }
  })

  const toggleMono = () => {
    setMono(prev => {
      const next = !prev
      try { localStorage.setItem('theme', next ? 'mono' : 'dark') } catch {}
      return next
    })
  }

  const C = mono ? CM : CD

  const todayDate = todayStr()

  const load = useCallback(async () => {
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const [b, a, t, r, rl] = await Promise.all([
        getBalances(), getAccounts(), getTransactions(200),
        getRecurring(), getRecurringLogs(month, year)
      ])
      setBalances(b); setAccounts(a); setTransactions(t)
      setRecurring(r); setRecurringLogs(rl); setError('')
    } catch { setError('Could not reach database.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    if (modal?.mode === 'edit') {
      await updateTransaction(modal.tx.id, data)
      await load()
    } else {
      const newTx = await createTransaction(data)
      await load()
      const id = Array.isArray(newTx) ? newTx[0]?.id : newTx?.id
      if (id) {
        setNewTxId(id)
        setTimeout(() => setNewTxId(null), 1800)
      }
    }
  }

  const handleDelete = async (id) => { await deleteTransaction(id); await load() }

  const closeModal = () => {
    setModalClosing(true)
    setTimeout(() => { setModal(null); setModalClosing(false) }, 320)
  }

  const closeRecurringSheet = () => {
    setRecurringSheetClosing(true)
    setTimeout(() => { setRecurringSheet(null); setRecurringSheetClosing(false) }, 320)
  }

  const closeRecurringForm = () => {
    setRecurringFormClosing(true)
    setTimeout(() => { setRecurringForm(null); setRecurringFormClosing(false) }, 320)
  }

  const handleRecurringSave = async (data) => {
    if (recurringForm?.entry) await updateRecurring(recurringForm.entry.id, data)
    else await createRecurring(data)
    await load()
  }

  const handleRecurringLog = async (entry) => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const existingLog = recurringLogs.find(l => l.recurring_id === entry.id)
    if (existingLog) {
      await deleteRecurringLog(entry.id, month, year)
      await load()
      closeRecurringSheet()
      return
    }
    closeRecurringSheet()
    setModal({
      mode: 'add',
      prefill: {
        description: entry.name,
        amount: String(entry.amount),
        account_id: entry.account_id,
        date: todayStr(),
      },
      recurringId: entry.id,
    })
  }

  const handleRecurringSkip = async (entry) => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const existingLog = recurringLogs.find(l => l.recurring_id === entry.id)
    if (existingLog) {
      await deleteRecurringLog(entry.id, month, year)
    } else {
      await createRecurringLog(entry.id, month, year, 'skipped')
    }
    await load()
    closeRecurringSheet()
  }

  const handleRecurringDelete = async (entry) => {
    await deleteRecurring(entry.id)
    await load()
    closeRecurringSheet()
  }

  const handleSaveWithRecurring = async (data) => {
    if (modal?.mode === 'edit') {
      await updateTransaction(modal.tx.id, data)
      await load()
    } else {
      const newTx = await createTransaction(data)
      await load()
      const id = Array.isArray(newTx) ? newTx[0]?.id : newTx?.id
      if (id) {
        setNewTxId(id)
        setTimeout(() => setNewTxId(null), 1800)
        if (modal?.recurringId) {
          const now = new Date()
          await createRecurringLog(modal.recurringId, now.getMonth() + 1, now.getFullYear(), 'logged', id)
          await load()
        }
      }
    }
  }

  // Banner entries — only show actionable ones
  const bannerEntries = recurring.filter(e => {
    const status = getRecurringStatus(e, recurringLogs, todayDate)
    return status === 'due' || status === 'overdue' || status === 'upcoming'
  })

  const weekly = getWeeklySummary(transactions)
  const monthly = getMonthlySummary(transactions)
  const recent = transactions.slice(0, 7)
  const recentGrouped = groupByDate(recent)
  const allGrouped = groupByDate(transactions)

  return (
    <ThemeCtx.Provider value={mono}>
      <div style={{ minHeight: '100vh', background: C.base, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.primary, transition: 'background 1s ease, color 1s ease' }}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
          @keyframes txSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes txGlowMint { 0% { box-shadow: 0 0 0 0 rgba(79,255,176,0); } 30% { box-shadow: 0 0 0 4px rgba(79,255,176,0.25), inset 0 0 12px rgba(79,255,176,0.15); } 100% { box-shadow: 0 0 0 0 rgba(79,255,176,0); } }
          @keyframes txGlowAmber { 0% { box-shadow: 0 0 0 0 rgba(255,176,50,0); } 30% { box-shadow: 0 0 0 4px rgba(255,176,50,0.25), inset 0 0 12px rgba(255,176,50,0.15); } 100% { box-shadow: 0 0 0 0 rgba(255,176,50,0); } }
          input[type=date]::-webkit-calendar-picker-indicator { filter: ${mono ? 'none' : 'invert(0.5)'}; }
          select option { background: ${mono ? '#fff' : '#16161f'}; color: ${mono ? '#1c1c1a' : '#fff'}; }
          input::placeholder { color: ${mono ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)'}; }
          * { box-sizing: border-box; } *:not([data-sheet]) { transition: background 1s ease, border-color 1s ease, color 1s ease, box-shadow 1s ease; } button, input, select { transition: background 1s ease, border-color 1s ease, color 1s ease; }
        `}</style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

        {/* Ambient glow — dark mode only */}
        {!mono && <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 500px 600px at 50% 5%, rgba(20,180,140,0.20) 0%, transparent 65%), radial-gradient(ellipse 400px 400px at 5% 50%, rgba(0,200,120,0.07) 0%, transparent 70%)' }} />}

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: `${SP['2xl']} ${SP.xl} 140px` }}>

          {/* ── DASHBOARD ── */}
          {screen === 'dashboard' && (
            <>
              {/* Hero zone */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SP.xl }}>
                <div>
                  <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: `0 0 ${SP.sm}` }}>{todayLabel()}</p>
                  {loading
                    ? <div style={{ height: '36px', width: '55%', borderRadius: '8px', background: mono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', marginBottom: SP.sm, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    : <h1 style={{ fontSize: T.hero.size, fontWeight: T.hero.weight, letterSpacing: T.hero.tracking, lineHeight: 1, margin: `0 0 4px`, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: C.primary }}>
                          {(balances?.total ?? 0) < 0 ? '-' : ''}{fmt(balances?.total ?? 0)}
                        </span>
                      </h1>
                  }
                  <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, letterSpacing: T.body.tracking, color: C.secondary, margin: `0 0 4px` }}>Total Balance</p>
                  <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: 0 }}>Updated just now</p>
                </div>
                {/* Theme toggle */}
                <button onClick={toggleMono} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'transparent', border: mono ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)', color: C.muted, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0, marginTop: '4px', transition: 'all 1s ease' }} title={mono ? 'Switch to dark' : 'Switch to mono'}>
                  {mono ? '◑' : '◐'}
                </button>
              </div>

              {error && <div style={{ background: mono ? 'rgba(0,0,0,0.06)' : 'rgba(255,176,50,0.1)', border: mono ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,176,50,0.3)', color: mono ? CM.secondary : CD.amber, fontSize: T.eyebrow.size, fontWeight: 500, borderRadius: R.sm, padding: `${SP.md} ${SP.lg}`, marginBottom: SP.lg }}>{error}</div>}

              {/* Recurring banners */}
              {!loading && bannerEntries.map(entry => {
                const status = getRecurringStatus(entry, recurringLogs, todayDate)
                return (
                  <RecurringBanner
                    key={entry.id}
                    entry={entry}
                    status={status}
                    today={todayDate}
                    onLog={() => handleRecurringLog(entry)}
                    onSkip={() => handleRecurringSkip(entry)}
                    onTap={() => setRecurringSheet({ entry, status })}
                  />
                )
              })}

              {/* Account cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.sm }}>
                {loading ? <><SkeletonCard /><SkeletonCard /></> : balances?.accounts.map(a => <BalanceCard key={a.id} label={a.name} amount={a.balance} />)}
              </div>

              {/* Weekly summary */}
              {!loading && <SummaryCard title="This Week" rangeLabel={weekly.rangeLabel} moneyIn={weekly.moneyIn} moneyOut={weekly.moneyOut} net={weekly.net} />}

              {/* Recurring section */}
              {!loading && (
                <div style={{ marginTop: SP.sm }}>
                  <RecurringSection
                    entries={recurring}
                    logs={recurringLogs}
                    today={todayDate}
                    onAdd={() => setRecurringForm({})}
                    onTapEntry={(entry) => setRecurringSheet({ entry, status: getRecurringStatus(entry, recurringLogs, todayDate) })}
                  />
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', background: mono ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)', margin: `${SP.xl} 0` }} />

              {/* Recent transactions */}
              <p style={{ fontSize: T.title.size, fontWeight: T.title.weight, letterSpacing: T.title.tracking, color: C.secondary, margin: `0 0 ${SP.lg}` }}>Recent</p>

              {!loading && transactions.length === 0
                ? <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, color: C.muted, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
                : Object.entries(recentGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={false} newTxId={newTxId} />)
              }
            </>
          )}

          {/* ── HISTORY ── */}
          {screen === 'history' && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SP.xl }}>
                <div>
                  <p style={{ fontSize: T.pageTitle.size, fontWeight: T.pageTitle.weight, letterSpacing: T.pageTitle.tracking, color: C.primary, margin: `0 0 4px` }}>All Transactions</p>
                  <p style={{ fontSize: T.eyebrow.size, fontWeight: T.eyebrow.weight, letterSpacing: T.eyebrow.tracking, color: C.muted, margin: 0 }}>
                    {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} · {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={toggleMono} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'transparent', border: mono ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)', color: C.muted, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0, transition: 'all 1s ease' }}>
                  {mono ? '◑' : '◐'}
                </button>
              </div>

              {!loading && <SummaryCard title="This Month" rangeLabel={monthly.monthLabel} moneyIn={monthly.moneyIn} moneyOut={monthly.moneyOut} net={monthly.net} />}

              <div style={{ height: '1px', background: mono ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)', margin: `${SP.lg} 0 ${SP.xl}` }} />

              {!loading && transactions.length === 0
                ? <p style={{ fontSize: T.body.size, fontWeight: T.body.weight, color: C.muted, textAlign: 'center', padding: '40px 0' }}>No transactions yet. Tap + to add one.</p>
                : Object.entries(allGrouped).map(([label, txs]) => <DateGroup key={label} dateLabel={label} txs={txs} onEdit={(tx) => setModal({ mode: 'edit', tx })} showDailyNet={true} newTxId={newTxId} />)
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
            onSave={handleSaveWithRecurring}
            onDelete={handleDelete}
            onClose={closeModal}
            closing={modalClosing}
            prefill={modal.prefill ?? {}}
          />
        )}

        {recurringSheet && (
          <RecurringSheet
            entry={recurringSheet.entry}
            status={recurringSheet.status}
            accounts={accounts}
            onLog={() => handleRecurringLog(recurringSheet.entry)}
            onSkip={() => handleRecurringSkip(recurringSheet.entry)}
            onEdit={() => { closeRecurringSheet(); setTimeout(() => setRecurringForm({ entry: recurringSheet.entry }), 350) }}
            onCancel={() => handleRecurringDelete(recurringSheet.entry)}
            onClose={closeRecurringSheet}
            closing={recurringSheetClosing}
          />
        )}

        {recurringForm !== null && (
          <RecurringForm
            entry={recurringForm.entry}
            accounts={accounts}
            onSave={handleRecurringSave}
            onClose={closeRecurringForm}
            closing={recurringFormClosing}
          />
        )}
      </div>
    </ThemeCtx.Provider>
  )
}
