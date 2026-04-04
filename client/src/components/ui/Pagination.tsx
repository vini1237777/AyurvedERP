// ── Reusable Pagination Component ─────────────────────────────────────────────
// Usage: import { Pagination, usePagination } from './Pagination'

import { useState } from "react"

export function usePagination<T>(data: T[], defaultPerPage = 50) {
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(defaultPerPage)

  const totalPages = Math.ceil(data.length / perPage)
  const paginated  = data.slice((page - 1) * perPage, page * perPage)
  const from       = data.length === 0 ? 0 : (page - 1) * perPage + 1
  const to         = Math.min(page * perPage, data.length)

  function onPerPage(n: number) { setPerPage(n); setPage(1) }
  function reset()               { setPage(1) }

  return { page, setPage, perPage, onPerPage, paginated, totalPages, from, to, total: data.length, reset }
}

export function Pagination({
  total, page, perPage, from, to, onPage, onPerPage,
}: {
  total: number; page: number; perPage: number; from: number; to: number;
  onPage: (p: number) => void; onPerPage: (n: number) => void;
}) {
  const totalPages = Math.ceil(total / perPage)
  if (total === 0) return null

  function pages(): (number | '...')[] {
    const p: (number | '...')[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) p.push(i); return p }
    p.push(1)
    if (page > 3) p.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) p.push(i)
    if (page < totalPages - 2) p.push('...')
    p.push(totalPages)
    return p
  }

  const NavBtn = ({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) => (
    <button onClick={onClick} disabled={disabled}
      className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors
        ${disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-600 cursor-pointer'}`}>
      {label}
    </button>
  )

  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
      {/* Per page + count */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Show:</span>
        {[25, 50, 100].map(n => (
          <button key={n} onClick={() => onPerPage(n)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors
              ${perPage === n ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-slate-100 text-slate-600'}`}>
            {n}
          </button>
        ))}
        <span className="ml-2 text-slate-400">
          Showing <b className="text-slate-600">{from}–{to}</b> of <b className="text-slate-600">{total}</b>
        </span>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-0.5">
        <NavBtn label="«" disabled={page === 1} onClick={() => onPage(1)} />
        <NavBtn label="‹" disabled={page === 1} onClick={() => onPage(page - 1)} />
        {pages().map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} className="px-2 text-slate-300 text-xs select-none">…</span>
            : <button key={p} onClick={() => onPage(Number(p))}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
                  ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                {p}
              </button>
        )}
        <NavBtn label="›" disabled={page === totalPages} onClick={() => onPage(page + 1)} />
        <NavBtn label="»" disabled={page === totalPages} onClick={() => onPage(totalPages)} />
      </div>
    </div>
  )
}
