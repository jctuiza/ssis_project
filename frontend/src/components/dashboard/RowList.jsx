import Skeleton from '../loading/Skeleton'
import { useDataLoading } from '../../context/DataLoading'
// rows: [{ id, title, subtitle, right }]
export default function RowList({ rows, empty = 'Nothing to show.' }) {
  const loading = useDataLoading()
  if (loading) return <div aria-busy="true" className="space-y-4">{Array.from({length:3},(_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
  if (!rows.length) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/10">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</p>
            <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
          </div>
          <div className="shrink-0">{r.right}</div>
        </li>
      ))}
    </ul>
  )
}


