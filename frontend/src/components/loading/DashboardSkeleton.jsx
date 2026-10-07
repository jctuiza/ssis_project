import Skeleton, { LoadingRegion } from './Skeleton'
import { cardClass } from '../../utils/styles'

export const DASHBOARD_LOADING_LAYOUTS = {
  admin: { stats: 5, links: 2 },
  registrar: { stats: 4, links: 3 },
  cashier: { stats: 4, links: 3 },
  department: { stats: 3, links: 2 },
}

export function SummaryPlaceholders({ count = 4, descriptions = false }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="mt-2 h-8 w-2/3" />
              {descriptions && <Skeleton className="mt-1 h-4 w-full" />}
            </div>
            <Skeleton className="h-11 w-11 shrink-0 !rounded-xl" />
          </div>
        </div>
      ))}
    </section>
  )
}

export function PanelPlaceholder({ rows = 3, icons = false, action = false }) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-44 max-w-full" />
          <Skeleton className="mt-1 h-4 w-64 max-w-full" />
        </div>
        {action && <Skeleton className="h-8 w-16 shrink-0" />}
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3">
            {icons && <Skeleton circle className="h-8 w-8 shrink-0" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  )
}

// Matches StaffDashboard: summary cards, quick links and two office panels.
export default function DashboardSkeleton({ role = 'registrar' }) {
  const layout = DASHBOARD_LOADING_LAYOUTS[role] ?? DASHBOARD_LOADING_LAYOUTS.registrar

  return (
    <LoadingRegion>
      <div className="space-y-7">
        <SummaryPlaceholders count={layout.stats} />

        <section className="flex flex-wrap gap-3">
          {Array.from({ length: layout.links }, (_, index) => (
            <div key={index} className={`${cardClass} flex items-center gap-2 !rounded-xl px-4 py-2.5`}>
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <PanelPlaceholder icons />
          <PanelPlaceholder />
        </section>
      </div>
    </LoadingRegion>
  )
}

