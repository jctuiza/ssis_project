import { TrendingUp } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import SummaryCard from '../../components/common/SummaryCard'
import Card from '../../components/common/Card'
import AsyncView from '../../components/common/AsyncView'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as reportService from '../../services/reportService'

const colors = ['bg-violet-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400']

export default function ReportsPage({ kind, description }) {
  const { user } = useSession()
  const departmentId = user.departmentId ?? undefined
  const { data, loading, error } = useService(() => reportService.getReport(kind, { departmentId }), [kind, departmentId])

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Reports" title="Reports" description={description} />
      <AsyncView loading={loading} error={error}>
        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.cards.map((c) => <SummaryCard key={c.label} label={c.label} value={c.value} icon={TrendingUp} />)}
            </section>
            <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {data.sections.map((section) => {
                const total = section.items.reduce((s, i) => s + i.value, 0) || 1
                return (
                  <Card key={section.title} title={section.title}>
                    <div className="space-y-4">
                      {section.items.map((item, i) => (
                        <div key={item.label}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{item.value}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${(item.value / total) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </section>
          </>
        )}
      </AsyncView>
    </div>
  )
}
