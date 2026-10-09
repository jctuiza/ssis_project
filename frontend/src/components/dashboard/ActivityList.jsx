import Skeleton from '../loading/Skeleton'
import { useDataLoading } from '../../context/DataLoading'
export default function ActivityList({ items, empty = 'No recent activity.' }) {
  const loading = useDataLoading()
  if (loading) return <div aria-busy="true" className="space-y-4">{Array.from({length:3},(_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
  if (!items?.length) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
          <div className="min-w-0">
            <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">{a.text ?? a.action}</p>
            <p className="mt-1 text-xs text-slate-400">{a.actor ? `${a.actor} · ` : ''}{a.time}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}


