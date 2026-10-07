import Skeleton, { LoadingRegion } from './Skeleton'
import { SummaryPlaceholders, PanelPlaceholder } from './DashboardSkeleton'
import { cardClass } from '../../utils/styles'

// Matches the section order and breakpoints in StudentHome.jsx.
export default function StudentHomeSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-7">
        <section className={cardClass}>
          <div className="px-5 pt-5">
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-5 w-3/4" />
              </div>
            ))}
          </div>
        </section>

        <SummaryPlaceholders count={4} descriptions />

        <section className="grid gap-6 xl:grid-cols-2">
          <PanelPlaceholder action />
          <PanelPlaceholder action />
        </section>

        <section className={cardClass}>
          <div className="px-5 pt-5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-1 h-4 w-60 max-w-full" />
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <Skeleton className="h-10 w-10 shrink-0 !rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-1 h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <PanelPlaceholder icons />
          <PanelPlaceholder icons />
        </section>
      </div>
    </LoadingRegion>
  )
}

