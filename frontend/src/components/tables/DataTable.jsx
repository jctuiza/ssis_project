import { useDataLoading } from '../../context/DataLoading'
import { useState } from 'react'
import Skeleton from '../loading/Skeleton'
import { ArrowUpDown } from 'lucide-react'
import SearchBar from '../forms/SearchBar'
import Pagination from './Pagination'

// columns: [{ key, label, sortable?, render?(row) }]
// filter: { key, options: [] }
// Bulk selection is opt-in. bulkActions: [{ label, onClick, disabled?, variant? }]
export default function DataTable({
  columns, rows = [], loading = false, loadingRowCount, rowKey = 'id', searchKeys = [], searchPlaceholder = 'Search…', filter,
  pageSize = 8, actions, empty = 'No records found.', toolbar, selectable = false, selectedKeys = [], onSelectionChange, canSelectRow, bulkActions = [],
}) {
  const contextLoading = useDataLoading()
  loading ||= contextLoading
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  let list = rows

  if (filter && status !== 'All') {
    list = list.filter((row) => row[filter.key] === status)
  }

  const q = query.trim().toLowerCase()

  if (q) {
    list = list.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '').toLowerCase().includes(q),
      ),
    )
  }

  if (sort.key) {
    list = [...list].sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      const comparison =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x ?? '').localeCompare(String(y ?? ''), undefined, {
              numeric: true,
            })

      return sort.dir === 'asc' ? comparison : -comparison
    })
  }

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(page, totalPages)
  const visible = list.slice((current - 1) * pageSize, current * pageSize)
  const selectableVisible = visible.filter(
    (row) => !canSelectRow || canSelectRow(row),
  )
  const selectedSet = new Set(selectedKeys)
  const selectedVisibleCount = selectableVisible.filter((row) =>
    selectedSet.has(row[rowKey]),
  ).length
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectedVisibleCount === selectableVisible.length

  const toggleSort = (key) =>
    setSort((currentSort) =>
      currentSort.key === key
        ? {
            key,
            dir: currentSort.dir === 'asc' ? 'desc' : 'asc',
          }
        : { key, dir: 'asc' },
    )

  const updateSelection = (nextKeys) => {
    if (!onSelectionChange) return

    const nextSet = new Set(nextKeys)
    onSelectionChange(rows.filter((row) => nextSet.has(row[rowKey])))
  }

  const toggleRow = (row, checked) => {
    const key = row[rowKey]
    const next = new Set(selectedKeys)

    if (checked) next.add(key)
    else next.delete(key)

    updateSelection(next)
  }

  const toggleVisible = (checked) => {
    const next = new Set(selectedKeys)

    selectableVisible.forEach((row) => {
      if (checked) next.add(row[rowKey])
      else next.delete(row[rowKey])
    })

    updateSelection(next)
  }

  const skeletonRows = Math.max(
    1,
    Math.min(pageSize, loadingRowCount ?? (rows.length || pageSize)),
  )
  const hasToolbar =
    searchKeys.length > 0 ||
    filter ||
    toolbar ||
    (selectable && selectedKeys.length > 0)

  return (
    <div aria-busy={loading || undefined}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          {searchKeys.length > 0 && (
            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {filter &&
              ['All', ...filter.options].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option)
                    setPage(1)
                  }}
                  aria-pressed={status === option}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    status === option
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-600 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-violet-500/10'
                  }`}
                >
                  {option}
                </button>
              ))}

            {toolbar}
          </div>
        </div>
      )}

      {selectable && selectedKeys.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-violet-500/5 px-5 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {selectedKeys.length} record(s) selected
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {bulkActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={loading || action.disabled}
                onClick={() => action.onClick(rows.filter((row) =>
                  selectedSet.has(row[rowKey]),
                ))}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  action.variant === 'danger'
                    ? 'border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
              >
                {action.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onSelectionChange?.([])}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-page text-xs text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select eligible rows on this page"
                    checked={allVisibleSelected}
                    disabled={loading || selectableVisible.length === 0}
                    onChange={(event) => toggleVisible(event.target.checked)}
                    className="h-4 w-4 accent-violet-500"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-5 py-3 font-medium"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-violet-600 dark:hover:text-violet-300"
                    >
                      {column.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}

              {actions && (
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {loading &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={`loading-${index}`} aria-hidden="true">
                  {selectable && (
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-5 py-3.5 text-slate-700 dark:text-slate-200"
                    >
                      <Skeleton
                        className={
                          column.skeletonClassName ?? 'h-5 w-full min-w-12 max-w-48'
                        }
                      />
                    </td>
                  ))}

                  {actions && (
                    <td className="px-5 py-3.5">
                      <Skeleton className="ml-auto h-8 w-24" />
                    </td>
                  )}
                </tr>
              ))}

            {!loading && visible.length === 0 && (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (selectable ? 1 : 0) +
                    (actions ? 1 : 0)
                  }
                  className="px-5 py-10 text-center text-slate-400"
                >
                  {empty}
                </td>
              </tr>
            )}

            {!loading &&
              visible.map((row) => {
                const key = row[rowKey]
                const rowCanBeSelected =
                  selectable && (!canSelectRow || canSelectRow(row))

                return (
                  <tr
                    key={key}
                    className="transition hover:bg-page dark:hover:bg-white/[0.03]"
                  >
                    {selectable && (
                      <td className="w-12 px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.studentName ?? row.name ?? row.ref ?? key}`}
                          checked={selectedSet.has(key)}
                          disabled={loading || !rowCanBeSelected}
                          onChange={(event) =>
                            toggleRow(row, event.target.checked)
                          }
                          className="h-4 w-4 accent-violet-500"
                        />
                      </td>
                    )}

                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-5 py-3.5 text-slate-700 dark:text-slate-200"
                      >
                        {column.render
                          ? column.render(row)
                          : row[column.key]}
                      </td>
                    ))}

                    {actions && (
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div
          role="status"
          aria-label="Loading records"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/10"
        >
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ) : (
        <Pagination
          page={current}
          totalPages={totalPages}
          total={list.length}
          pageSize={pageSize}
          onChange={setPage}
        />
      )}
    </div>
  )
}