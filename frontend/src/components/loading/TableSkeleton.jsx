import Skeleton, { LoadingRegion } from './Skeleton'
import { cardClass } from '../../utils/styles'

export default function TableSkeleton({ rows = 5, columns = 4, search = true, filters = false, actions = false, title = false, pagination = true }) {
  const count = columns + (actions ? 1 : 0)
  return <LoadingRegion><section className={`${cardClass} overflow-hidden`}>
    {title && <div className="border-b border-slate-100 px-5 py-4 dark:border-white/10"><Skeleton className="h-6 w-40" /></div>}
    {(search || filters) && <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
      {search && <Skeleton className="h-10 w-full lg:w-72" />}
      {filters && <div className="flex flex-wrap gap-2">{[0,1,2].map(i => <Skeleton key={i} className="h-6 w-20 !rounded-full" />)}</div>}
    </div>}
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid gap-5 bg-page px-5 py-3 dark:bg-white/[0.03]" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {Array.from({length:count},(_,i) => <Skeleton key={i} className="h-4 w-3/4" />)}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {Array.from({length:rows},(_,row) => <div key={row} className="grid items-center gap-5 px-5 py-3.5" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {Array.from({length:count},(_,i) => <Skeleton key={i} className={actions && i === count-1 ? 'h-8 w-16 justify-self-end' : 'h-5 w-4/5'} />)}
          </div>)}
        </div>
      </div>
    </div>
    {pagination && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/10"><Skeleton className="h-4 w-36" /><div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></div>}
  </section></LoadingRegion>
}

