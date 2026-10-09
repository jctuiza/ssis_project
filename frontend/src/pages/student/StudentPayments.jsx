import { DataLoading } from '../../context/DataLoading'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { Landmark, Wallet } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SummaryCard from '../../components/ui/SummaryCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import AsyncView from '../../components/feedback/AsyncView'
import ActivityList from '../../components/dashboard/ActivityList'
import RowList from '../../components/dashboard/RowList'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'
import { getNotifications } from '../../services/admin/activityService'

// View-only: students can check their balance and history. All payments are made face-to-face at the Cashier's Office
// and recorded by the Cashier, so there is no pay button here.
export default function StudentPayments() {
  const { user } = useSession()
  const { data: received, loading, error } = useService(() => paymentService.getAccountForStudent(user.id), [user.id], "pages/student/StudentPayments.jsx:1")
  const notes = useService(() => getNotifications(), [], "pages/student/StudentPayments.jsx:2")
  const waiting = loading && received == null
  const data = received ?? { assessment: {}, history: [], documentFees: [] }
  const a = data?.assessment
  const paymentNotes = (notes.data ?? []).filter((n) => n.page === 'payments').slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Payments"/>
      <DataLoading value={waiting}>
      {error && <p role="alert" className="text-sm text-rose-500">{error.message}</p>}
        {data && (
          <>
            {a ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="Total assessment" value={peso(a.total)} icon={Wallet} />
                  <SummaryCard label="Amount paid" value={peso(a.paid)} icon={Wallet} />
                  <SummaryCard label="Outstanding balance" value={peso(a.balance)} icon={Wallet} />
                  <SummaryCard label="Payment status" value={a.status} icon={Wallet} />
                </section>
                <Card title="Assessment" description={a.term}>
                  {a.tuitionPending && <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">Miscellaneous fees are shown below. Tuition and the final total will be updated once the Department assigns matching subjects.</p>}
                  <InfoGrid columns="sm:grid-cols-3" items={[
                    { label: 'Tuition', value: a.tuitionPending ? 'Awaiting subjects' : peso(a.tuition) },
                    { label: 'Miscellaneous fees', value: peso(a.misc) },
                    { label: 'Status', value: <StatusBadge status={a.status} /> },
                  ]} />
                </Card>
              </>
            ) : <Card><p className="text-sm text-slate-500">No assessment has been issued for this term yet.</p></Card>}

            <Card>
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Landmark className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Pay at the Cashier's Office</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tuition and fees cannot be paid online. Visit the Cashier's Office to pay in full or in installments, and bring your Student ID. Your balance, status and history update here as soon as the Cashier records your payment.
                  </p>
                </div>
              </div>
            </Card>

            {data.documentFees.length > 0 && (
              <Card title="Document fees to pay at the Cashier" description="These requests were approved by the Registrar and are waiting for your payment.">
                <RowList rows={data.documentFees.map((t) => ({ id: t.id, title: t.description, subtitle: t.reference, right: <span className="text-sm font-semibold text-slate-900 dark:text-white">{peso(t.amount)}</span> }))} />
              </Card>
            )}

            <Card title="Payment notifications" description="Latest updates from the Cashier"><ActivityList items={paymentNotes} empty="No payment notifications yet." /></Card>

            <Card title="Payment history" padded={false}>
              <DataTable
                rows={data.history}
                empty="No payments recorded yet."
                columns={[
                  { key: 'reference', label: 'Transaction', sortable: true },
                  { key: 'date', label: 'Date' },
                  { key: 'description', label: 'Description' },
                  { key: 'method', label: 'Method' },
                  { key: 'amount', label: 'Amount', sortable: true, render: (t) => peso(t.amount) },
                  { key: 'balanceAfter', label: 'Balance after', render: (t) => (t.balanceAfter == null ? '—' : peso(t.balanceAfter)) },
                  { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
                ]}
              />
            </Card>
          </>
        )}
      </DataLoading>
    </div>
  )
}

