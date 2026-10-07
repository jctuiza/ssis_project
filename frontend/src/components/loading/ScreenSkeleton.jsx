import Skeleton, { LoadingRegion } from './Skeleton'
import TableSkeleton from './TableSkeleton'
import StudentHomeSkeleton from './StudentHomeSkeleton'
import DashboardSkeleton, { SummaryPlaceholders, PanelPlaceholder } from './DashboardSkeleton'
import { cardClass } from '../../utils/styles'

const table = (columns, search = true, filters = false, actions = false) => ({ kind: 'table', columns, search, filters, actions })
export const STAFF_TABLE_LAYOUTS = {
  users: table(5,true,true,true), 'student-accounts': table(5,true,true,true), 'staff-accounts': table(5,true,true,true),
  students: table(6,true,true,true), enrollment: table(7,true,true,true), grades: table(9,true,true,true),
  clearance: table(6,true,true,true), documents: table(6,true,true,true), requests: table(6,true,true,true),
  accounts: table(6,true,true), assessments: table(6), payments: table(5,true,true,true),
  'document-fees': table(6,true,true,true), transactions: table(8,true,true), monitor: table(8,true,true),
  records: table(7), departments: table(5), announcements: table(4,true,false,true), logs: table(4,true,true),
}
export function layoutForPage(role, page) {
  if (page === 'profile') return { kind: 'profile' }
  if (role === 'student') return { kind: ({ home:'student-home', enrollment:'enrollment', grades:'grades', clearance:'clearance', documents:'documents', payments:'payments', id:'id' })[page] ?? 'student-home' }
  if (page === 'dashboard') return { kind: 'dashboard' }
  if (page === 'roles') return { kind: 'roles' }
  if (page === 'settings') return { kind: 'settings' }
  if (page === 'reports') return { kind: 'reports' }
  return STAFF_TABLE_LAYOUTS[page] ?? { kind: 'dashboard' }
}
function Lines({ count = 3 }) {
  return <div className="space-y-3">{Array.from({length:count},(_,i) => <Skeleton key={i} className={`h-4 ${i%2 ? 'w-3/4' : 'w-full'}`} />)}</div>
}
function Box({ children, title = false, description = false, className = '' }) {
  return <section className={`${cardClass} ${className}`}>
    {title && <div className="px-5 pt-5"><Skeleton className="h-6 w-44 max-w-full" />{description && <Skeleton className="mt-1 h-4 w-64 max-w-full" />}</div>}
    <div className="p-5">{children}</div>
  </section>
}
function Fields({ count = 6, columns = 'sm:grid-cols-2 xl:grid-cols-3' }) {
  return <div className={`grid gap-4 ${columns}`}>{Array.from({length:count},(_,i) => <div key={i}><Skeleton className="h-4 w-24" /><Skeleton className="mt-1 h-5 w-3/4" /></div>)}</div>
}
function FormFields({ count = 3 }) {
  return <div className="space-y-4">{Array.from({length:count},(_,i) => <div key={i}><Skeleton className="mb-1.5 h-4 w-28" /><Skeleton className="h-11 w-full" /></div>)}</div>
}
export function DocumentRequestFormSkeleton() {
  return <LoadingRegion><Box title description><div className="grid gap-4 md:grid-cols-2"><FormFields count={1} /><FormFields count={1} /><Skeleton className="h-10 w-36 md:col-span-2" /></div></Box></LoadingRegion>
}
export function DocumentRequestsTableSkeleton() {
  return <TableSkeleton columns={5} search filters actions title />
}

export default function ScreenSkeleton({ kind = 'table', role = 'registrar', ...tableProps }) {
  if (kind === 'student-home') return <StudentHomeSkeleton />
  if (kind === 'dashboard') return <DashboardSkeleton role={role} />
  if (kind === 'table') return <TableSkeleton {...tableProps} />
  return <LoadingRegion><div className={kind === 'payments' || kind === 'profile' || kind === 'reports' ? 'space-y-7' : 'space-y-6'}>
    {kind === 'enrollment' && <>
      <Box title><Fields /></Box>
      <TableSkeleton columns={4} search={false} title />
    </>}
    {kind === 'grades' && <>
      <Skeleton className="h-11 w-full sm:max-w-sm" />
      <TableSkeleton columns={6} rows={5} search={false} title pagination={false} />
    </>}
    {kind === 'clearance' && <>
      <Box><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 shrink-0 !rounded-xl" /><div className="flex-1"><Skeleton className="h-5 w-56 max-w-full" /><Skeleton className="mt-2 h-2 w-full" /></div></div></Box>
      <section className="grid gap-4 md:grid-cols-3">{[0,1,2].map(i => <Box key={i}><div className="mb-3 flex justify-between gap-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-20" /></div><Lines count={2} /><Skeleton className="mt-3 h-4 w-36" /></Box>)}</section>
    </>}
    {kind === 'documents' && <><DocumentRequestFormSkeleton /><DocumentRequestsTableSkeleton /></>}
    {kind === 'payments' && <>
      <SummaryPlaceholders descriptions />
      <Box title description><Fields count={3} columns="sm:grid-cols-2" /></Box>
      <Box><div className="flex items-start gap-3"><Skeleton className="h-5 w-5 shrink-0" /><div className="flex-1"><Lines count={2} /></div></div></Box>
      <PanelPlaceholder icons />
      <TableSkeleton columns={7} search={false} title />
    </>}
    {kind === 'id' && <>
      <div className="grid justify-items-center gap-6 md:grid-cols-2">{[0,1].map(side => <section key={side} className={`${cardClass} flex min-h-[520px] w-full max-w-[340px] flex-col overflow-hidden`}>
        <div className="flex items-center gap-3 px-5 py-4"><Skeleton className="h-10 w-10 shrink-0" /><div className="flex-1"><Lines count={2} /></div></div>
        <div className="flex-1 px-5 py-6">{side === 0 ? <><Skeleton className="mx-auto h-36 w-36 !rounded-2xl" /><Skeleton className="mx-auto mt-4 h-6 w-3/4" /><Skeleton className="mx-auto mt-2 h-4 w-1/2" /><div className="mt-6"><Lines /></div></> : <><Fields count={6} columns="grid-cols-2" /><div className="mt-5"><Lines /></div></>}</div>
        <div className="border-t border-slate-100 px-5 py-3 dark:border-white/10"><Skeleton className="h-7 w-full" /></div>
      </section>)}</div>
      <Box><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex-1"><Lines count={2} /></div><Skeleton className="h-10 w-44 shrink-0" /></div></Box>
    </>}
    {kind === 'profile' && <>
      <section className={`${cardClass} overflow-hidden`}><Skeleton className="h-28 !rounded-none" /><div className="px-5 pb-6 sm:px-7"><div className="-mt-10 flex items-end gap-4"><Skeleton className="h-20 w-20 shrink-0 !rounded-2xl" /><div className="min-w-0 flex-1 pb-1"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="mt-1 h-5 w-56 max-w-full" /></div></div><Skeleton className="mt-5 h-10 w-36" /><Skeleton className="mt-2 h-4 w-64 max-w-full" /><div className="mt-8"><Fields count={role === 'student' ? 12 : 7} columns="sm:grid-cols-2" /></div></div></section>
      <Box title description><div className="max-w-md"><FormFields /><Skeleton className="mt-4 h-10 w-40" /></div><Skeleton className="mt-4 h-4 w-64 max-w-full" /></Box>
    </>}
    {kind === 'roles' && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4].map(i => <Box key={i} title description><Lines count={4} /></Box>)}</section>}
    {kind === 'settings' && <Box><div className="grid gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:grid-cols-2"><FormFields count={1} /><FormFields count={1} /></div><div className="divide-y divide-slate-100 dark:divide-white/10">{[0,1,2,3].map(i => <div key={i} className="flex items-center justify-between gap-4 py-4"><div className="flex-1"><Skeleton className="h-5 w-40" /><Skeleton className="mt-1 h-4 w-3/4" /></div><Skeleton className="h-6 w-11 !rounded-full" /></div>)}</div><Skeleton className="ml-auto mt-5 h-10 w-36" /></Box>}
    {kind === 'reports' && <><SummaryPlaceholders /><section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{[0,1,2].map(i => <Box key={i} title><div className="space-y-4">{[0,1,2].map(j => <div key={j}><div className="mb-1.5 flex justify-between"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-8" /></div><Skeleton className="h-2 w-full" /></div>)}</div></Box>)}</section></>}
  </div></LoadingRegion>
}

