import DashboardSkeleton from '../loading/DashboardSkeleton'
import PageHeader from '../ui/PageHeader'
import SummaryCard from '../ui/SummaryCard'
import Card from '../ui/Card'
import AsyncView from '../feedback/AsyncView'
import ActivityList from './ActivityList'
import { useSession } from '../../context/session'

// Shared dashboard shell for Admin, Registrar, Cashier and Department.
// stats: [{ label, value, icon }]   panel: { title, description, content }   links: [{ label, page, icon }]
export default function StaffDashboard({ state, description, build }) {
  const { user, navigate } = useSession()
  const view = state.data ? build(state.data) : null

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Dashboard" title={`Welcome back, ${user.name}!`} description={description} />
      <AsyncView loading={state.loading} error={state.error} hasData={state.data != null} skeleton={<DashboardSkeleton role={user.role} />}>
        {view && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {view.stats.map((s) => <SummaryCard key={s.label} {...s} />)}
            </section>

            {view.links && (
              <section className="flex flex-wrap gap-3">
                {view.links.map(({ label, page, icon: Icon }) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => navigate(page)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-[#26272c] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/10"
                  >
                    <Icon className="h-4 w-4 text-violet-500" />{label}
                  </button>
                ))}
              </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card title="Recent activities" description="Latest activity in your office">
                <ActivityList items={view.activities} />
              </Card>
              <Card title={view.panel.title} description={view.panel.description}>{view.panel.content}</Card>
            </section>
          </>
        )}
      </AsyncView>
    </div>
  )
}

