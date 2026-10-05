import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const btn = 'grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-page disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
      <p>Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={btn}><ChevronLeft className="h-4 w-4" /></button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={btn}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
