import { useState, useRef, useEffect } from 'react'

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  locked?: boolean
}
export function Input({ label, error, locked, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      <input
        {...props}
        readOnly={locked}
        className={`border rounded-md px-3 py-2 text-sm outline-none transition-all
          ${locked ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'}
          ${error ? 'border-red-400' : ''}
          ${className}`}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string | number; label: string }[]
  error?: string
}
export function Select({ label, options, error, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      <select
        {...props}
        className={`border border-slate-200 rounded-md px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 ${error?'border-red-400':''} ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary'|'secondary'|'danger'|'ghost'|'success'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm'|'md'|'lg'
  loading?: boolean
}
const btnClasses: Record<BtnVariant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
  danger:    'bg-red-600 hover:bg-red-700 text-white border-transparent',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
}
const btnSize: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}
export function Button({ variant='primary', size='md', loading, children, className='', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 font-medium rounded-lg border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${btnClasses[variant]} ${btnSize[size]} ${className}`}
    >
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = 'blue'|'green'|'red'|'yellow'|'gray'
const badgeColors: Record<BadgeColor, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-emerald-100 text-emerald-700',
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray:   'bg-slate-100 text-slate-600',
}
export function Badge({ children, color='gray' }: { children: React.ReactNode; color?: BadgeColor }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[color]}`}>{children}</span>
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }
export function Modal({ open, onClose, title, children, width='max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)'}}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Search Dropdown ──────────────────────────────────────────────────────────
interface SearchDropdownProps<T> {
  value: string
  onChange: (val: string) => void
  onSelect: (item: T) => void
  options: T[]
  getLabel: (item: T) => string
  getSub?: (item: T) => string
  placeholder?: string
  label?: string
  className?: string
}
export function SearchDropdown<T extends { id: number }>({
  value, onChange, onSelect, options, getLabel, getSub, placeholder, label, className=''
}: SearchDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(value.toLowerCase()))

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>}
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(item => (
            <div key={item.id} onMouseDown={() => { onSelect(item); setOpen(false) }}
              className="px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0">
              <div className="text-sm font-medium text-slate-800">{getLabel(item)}</div>
              {getSub && <div className="text-xs text-slate-500 mt-0.5">{getSub(item)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; actions?: React.ReactNode }
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>{children}</div>
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-400">📭</span>
      </div>
      <h3 className="font-semibold text-slate-700 text-base">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function Spinner({ size='md' }: { size?: 'sm'|'md'|'lg' }) {
  const s = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-10 h-10' }[size]
  return <div className={`${s} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}/>
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg"/>
    </div>
  )
}

// ─── Toast (simple) ───────────────────────────────────────────────────────────
export function Toast({ message, type='success', onClose }: { message: string; type?: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
      ${type==='success'?'bg-emerald-600 text-white':'bg-red-600 text-white'}`}>
      <span>{type==='success'?'✓':'✕'}</span>
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">×</button>
    </div>
  )
}
