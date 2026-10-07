import { useState } from 'react'
import Skeleton from '../loading/Skeleton'
import { ArrowUpDown } from 'lucide-react'
import SearchBar from '../forms/SearchBar'
import Pagination from './Pagination'

// columns: [{ key, label, sortable?, render?(row) }]   filter: { key, options: [] }
export default function DataTable({
  columns, rows = [], loading = false, loadingRowCount, rowKey = 'id', searchKeys = [], searchPlaceholder = 'Search…', filter,
  pageSize = 8, actions, empty = 'No records found.', toolbar,
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  let list = rows
  if (filter && status !== 'All') list = list.filter((r) => r[filter.key] === status)
  const q = query.trim().toLowerCase()
  if (q) list = list.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
  if (sort.key) {
    list = [...list].sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
      return sort.dir === 'asc' ? c : -c
    })
  }

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(page, totalPages)
  const visible = list.slice((current - 1) * pageSize, current * pageSize)
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const skeletonRows = Math.max(1, Math.min(pageSize, loadingRowCount ?? (rows.length || pageSize)))
  const hasToolbar = searchKeys.length > 0 || filter || toolbar

  return (
    <div aria-busy={loading || undefined}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          {searchKeys.length > 0 && (
            <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder={searchPlaceholder} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {filter && ['All', ...filter.options].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { setStatus(o); setPage(1) }}
                aria-pressed={status === o}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  status === o
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-600 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-violet-500/10'
                }`}
              >
                {o}
              </button>
            ))}
            {toolbar}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-page text-xs text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-5 py-3 font-medium">
                  {c.sortable ? (
                    <button type="button" disabled={loading} onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-300">
                      {c.label}<ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : c.label}
                </th>
              ))}
              {actions && <th className="px-5 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {loading && Array.from({ length: skeletonRows }, (_, index) => (
              <tr key={`loading-${index}`} aria-hidden="true">
                {columns.map((column) => <td key={column.key} className="px-5 py-3.5 text-slate-700 dark:text-slate-200"><Skeleton className={column.skeletonClassName ?? 'h-5 w-full min-w-12 max-w-48'} /></td>)}
                {actions && <td className="px-5 py-3.5"><Skeleton className="ml-auto h-8 w-24" /></td>}
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-5 py-10 text-center text-slate-400">{empty}</td></tr>
            )}
            {!loading && visible.map((row) => (
              <tr key={row[rowKey]} className="transition hover:bg-page dark:hover:bg-white/[0.03]">
                {columns.map((c) => (
                  <td key={c.key} className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{c.render ? c.render(row) : row[c.key]}</td>
                ))}
                {actions && <td className="px-5 py-3.5"><div className="flex justify-end gap-1">{actions(row)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <div role="status" aria-label="Loading records" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/10"><Skeleton className="h-4 w-36" /><div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></div> : <Pagination page={current} totalPages={totalPages} total={list.length} pageSize={pageSize} onChange={setPage} />}
    </div>
  )
}


