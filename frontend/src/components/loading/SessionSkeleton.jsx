import { useLocation } from 'react-router-dom'
import Skeleton, { LoadingRegion } from './Skeleton'
import PageSkeleton from './PageSkeleton'

export default function SessionSkeleton({ error, onRetry }) {
  const { pathname } = useLocation()
  const [role, page] = pathname.split('/').filter(Boolean)
  const portal = ['admin', 'student', 'registrar', 'cashier', 'department'].includes(role) && page && page !== 'login'
  return <main className="min-h-screen bg-page dark:bg-slate-950" data-session-skeleton>
    {error && <div role="alert" className="mx-auto max-w-3xl px-6 pt-6 text-sm text-slate-700 dark:text-slate-200">{error.message} <button type="button" className="ml-2 text-violet-600 underline dark:text-violet-300" onClick={onRetry}>Retry</button></div>}
    {portal ? <>
      <LoadingRegion className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 p-6 dark:border-white/10 lg:block">
        <Skeleton className="h-12 w-44" /><div className="mt-10 space-y-6">{Array.from({length:7},(_,i)=><Skeleton key={i} className="h-8 w-full" />)}</div>
      </LoadingRegion>
      <div className="lg:ml-64"><LoadingRegion className="flex h-20 items-center justify-between border-b border-slate-200 px-6 dark:border-white/10"><Skeleton className="h-7 w-40" /><Skeleton circle className="h-10 w-10" /></LoadingRegion>
        <div className="mx-auto max-w-7xl p-6"><PageSkeleton role={role} page={page} /></div>
      </div>
    </> : <LoadingRegion className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-sm space-y-6"><Skeleton className="h-9 w-56" /><Skeleton className="h-5 w-72 max-w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-11 w-full" /></div></LoadingRegion>}
  </main>
}
