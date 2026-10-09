import Skeleton from '../loading/Skeleton'
import PageHeader from '../ui/PageHeader'
import SummaryCard from '../ui/SummaryCard'
import Card from '../ui/Card'
import ActivityList from './ActivityList'
import { useSession } from '../../context/session'
const pendingData = { totals: {}, activities: [], logs: [], topBalances: [], recentRequests: [], pending: [], usersByRole: [] }
export default function StaffDashboard({ state,description,build }) {
  const { user,navigate } = useSession()
  const view = build(state.data ?? pendingData)
  const waiting = state.loading && state.data == null
  const body = <div className="space-y-4" aria-busy="true">{Array.from({length:3},(_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
  return <div className="space-y-7">
    <PageHeader eyebrow="Dashboard" title={`Welcome back, ${user.name}!`} description={description} />
    {state.error && <p role="alert" className="text-sm text-rose-500">{state.data ? 'Showing saved data. ' : ''}{state.error.message} <button className="underline" onClick={state.reload}>Retry</button></p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{view.stats.map(s=><SummaryCard key={s.label} {...s} value={waiting ? <Skeleton className="h-8 w-24" /> : state.error && !state.data ? '—' : s.value} />)}</section>
    {view.links && <section className="flex flex-wrap gap-3">{view.links.map(({label,page,icon:Icon})=><button key={page} type="button" onClick={()=>navigate(page)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-[#26272c] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/10"><Icon className="h-4 w-4 text-violet-500" />{label}</button>)}</section>}
    <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card title="Recent activities" description="Latest activity in your office">{waiting ? body : state.error && !state.data ? <p>Activities unavailable.</p> : <ActivityList items={view.activities} />}</Card>
      <Card title={view.panel.title} description={waiting ? <Skeleton className="h-4 w-48" /> : view.panel.description}>{waiting ? body : state.error && !state.data ? <p>Records unavailable.</p> : view.panel.content}</Card>
    </section>
  </div>
}
