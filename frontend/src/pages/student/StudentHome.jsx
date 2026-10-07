import StudentHomeSkeleton from '../../components/loading/StudentHomeSkeleton'
import { GraduationCap, BookOpen, ClipboardCheck, FileText, Wallet, UserRound, Megaphone } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SummaryCard from '../../components/ui/SummaryCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import AsyncView from '../../components/feedback/AsyncView'
import ActivityList from '../../components/dashboard/ActivityList'
import RowList from '../../components/dashboard/RowList'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { peso } from '../../utils/format'
import * as studentService from '../../services/student/studentService'

const quick = [
  { page: 'enrollment', label: 'Enrollment', desc: 'View your subjects and status', icon: GraduationCap },
  { page: 'grades', label: 'Grades', desc: 'Check your grades online', icon: BookOpen },
  { page: 'clearance', label: 'Clearance', desc: 'See which offices cleared you', icon: ClipboardCheck },
  { page: 'documents', label: 'Document Requests', desc: 'Request certificates and records', icon: FileText },
  { page: 'payments', label: 'Payments', desc: 'View your balance and payment history', icon: Wallet },
  { page: 'profile', label: 'Profile', desc: 'Your account information', icon: UserRound },
]

// The student's landing page after login (/student/home). Everything here comes from the shared database,
// so a Registrar approval or a Cashier payment shows up without a reload.
export default function StudentHome() {
  const { user, navigate } = useSession()
  const { data, loading, error } = useService(() => studentService.getDashboard(user.id), [user.id], "pages/student/StudentHome.jsx:1")

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Homepage"/>
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<StudentHomeSkeleton />}>
        {data && (
          <>
            <Card title="Student information">
              <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3" items={[
                { label: 'Name', value: data.student.name },
                { label: 'Student ID', value: data.student.id },
                { label: 'Program', value: data.student.program },
                { label: 'Year level', value: data.student.yearLevel },
                { label: 'Academic term', value: data.term },
                { label: 'Enrollment status', value: <StatusBadge status={data.student.enrollmentStatus} /> },
              ]} />
            </Card>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Payment status" value={data.payment?.status ?? 'No assessment'} icon={Wallet} description={data.payment ? `Paid ${peso(data.payment.paid)} of ${peso(data.payment.total)}` : data.term} />
              <SummaryCard label="Outstanding balance" value={peso(data.balance)} icon={Wallet} description="Pay at the Cashier's Office" />
              <SummaryCard label="Active document requests" value={data.pendingRequests} icon={FileText} description={data.awaitingPayment ? `${data.awaitingPayment} awaiting payment at the Cashier` : 'Track them below'} />
              <SummaryCard label="Clearance status" value={`${data.clearance.cleared} of ${data.clearance.total} cleared`} icon={ClipboardCheck} description="Registrar, Cashier, Department" />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card title="My document requests" description="Latest requests and where they are now" action={<Button variant="ghost" size="sm" onClick={() => navigate('documents')}>View all</Button>}>
                <RowList
                  empty="You have not requested any documents yet."
                  rows={data.requests.map((r) => ({ id: r.ref, title: r.type, subtitle: `${r.ref} · ${r.date}`, right: <StatusBadge status={r.status} /> }))}
                />
              </Card>
              <Card title="Recent transactions" description="Recorded by the Cashier" action={<Button variant="ghost" size="sm" onClick={() => navigate('payments')}>View all</Button>}>
                <RowList
                  empty="No payments recorded yet."
                  rows={data.transactions.map((t) => ({ id: t.id, title: t.description, subtitle: `${t.reference} · ${t.date}`, right: <span className="text-sm font-semibold text-slate-900 dark:text-white">{peso(t.amount)}</span> }))}
                />
              </Card>
            </section>

            <Card title="Quick services" description="Everything you used to line up for">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {quick.map(({ page, label, desc, icon: Icon }) => (
                  <button key={page} type="button" onClick={() => navigate(page)} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/60 dark:border-white/10 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/10">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Icon className="h-5 w-5" /></span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card title="Recent notifications" description="Requests, payments and clearance"><ActivityList items={data.notifications} empty="No notifications yet." /></Card>
              <Card title="Announcements" description="From the university">
                <ul className="space-y-4">
                  {data.announcements.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{a.body}</p>
                        <p className="mt-1 text-xs text-slate-400">{a.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </>
        )}
      </AsyncView>
    </div>
  )
}

