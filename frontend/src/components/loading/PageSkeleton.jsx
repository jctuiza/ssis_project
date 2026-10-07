import { GRADE_COLUMNS } from '../../config/gradeColumns'
import { SUBJECT_COLUMNS } from '../../config/subjectColumns'
import DataTable from '../tables/DataTable'
import Card from '../ui/Card'
import Skeleton from './Skeleton'
import ScreenSkeleton, { layoutForPage } from './ScreenSkeleton'

export default function PageSkeleton({ role = 'registrar', page, kind }) {
  // Auth and session loading use null fallbacks in App.jsx.
  if (page === 'login') return null
  const layout = page ? layoutForPage(role, page) : { kind: kind ?? 'table' }
  const compact = page === 'profile' || (role === 'student' && page !== 'home') || layout.kind === 'student-home'
  const maxWidth = layout.kind === 'settings' ? 'mx-auto max-w-3xl' : ['profile','id'].includes(layout.kind) ? 'mx-auto max-w-4xl' : ''
  return <div className={`${maxWidth} ${['dashboard','student-home','reports','profile'].includes(layout.kind) ? 'space-y-7' : 'space-y-6'}`}>
    <div aria-hidden="true" className="flex items-end justify-between gap-4"><div className="min-w-0 space-y-2"><Skeleton className="h-4 w-40" />{!compact && <><Skeleton className="h-8 w-80 max-w-full sm:h-9" /><Skeleton className="h-5 w-96 max-w-full" /></>}</div>{page === 'profile' && <Skeleton className="h-10 w-32 shrink-0" />}</div>
    {['subjects', 'grades'].includes(page) && role !== 'student' && <Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 2 }, (_, index) => <div key={index}><Skeleton className="mb-1.5 h-4 w-28" /><Skeleton className="h-10 w-full" /></div>)}</div></Card>}
    {page === 'grades' && role !== 'student' && <Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 2 }, (_, index) => <div key={index}><Skeleton className="mb-1.5 h-4 w-28" /><Skeleton className="h-10 w-full" /></div>)}</div></Card>}
    {page === 'grades' && role !== 'student' ? <Card padded={false}><DataTable columns={GRADE_COLUMNS} loading searchKeys={['studentId', 'studentName']} actions={() => null} /></Card> : page === 'subjects' ? <Card padded={false}><DataTable columns={SUBJECT_COLUMNS} loading searchKeys={['code', 'name', 'department']} searchPlaceholder="Search code, subject or college" actions={() => null} /></Card> : <ScreenSkeleton role={role} {...layout} />}
  </div>
}

