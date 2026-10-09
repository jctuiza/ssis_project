import Skeleton from '../../components/loading/Skeleton'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { ClipboardCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import AsyncView from '../../components/feedback/AsyncView'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as clearanceService from '../../services/shared/clearanceService'

export default function StudentClearance() {
  const { user } = useSession()
  const { data: received, loading, error } = useService(() => clearanceService.getForStudent(user.id), [user.id], "pages/student/StudentClearance.jsx:1")
  const waiting = loading && received == null
  const data = received ?? (user.clearanceOffices ?? []).map(office=>({id:office,office}))
  const cleared = data?.filter((c) => c.status === 'Cleared').length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Clearance"/>
      <>
      {error && <p role="alert" className="text-sm text-rose-500">{error.message}</p>}
        {data && (
          <>
            <Card>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><ClipboardCheck className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{waiting ? <Skeleton className="h-5 w-48" /> : `${cleared} of ${data.length} offices cleared`}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(cleared / (data.length || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Card>
            <section className="grid gap-4 md:grid-cols-3">
              {data.map((c) => (
                <Card key={c.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{c.office}</h3>
                    {waiting ? <Skeleton className="h-6 w-20" /> : <StatusBadge status={c.status} />}
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {waiting ? <Skeleton className="h-10 w-full" /> : c.status === 'Cleared' ? 'No action needed.' : c.remarks || 'Visit or contact this office to complete your clearance.'}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">{waiting ? <Skeleton className="h-4 w-36" /> : `Last updated ${c.updatedAt}`}</p>
                </Card>
              ))}
            </section>
          </>
        )}
      </>
    </div>
  )
}

