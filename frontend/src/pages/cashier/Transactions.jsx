import ResourcePage from '../../components/dashboard/ResourcePage'
import StatusBadge from '../../components/ui/StatusBadge'
import { TRANSACTION_STATUSES } from '../../config/constants'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p></div>)
const money = (key) => (row) => peso(row[key])

export default function Transactions({ readOnly = false }) {
  return (
    <ResourcePage
      eyebrow="Transactions"
      title="Transactions"
      description={readOnly ? 'Read-only view of every payment recorded by the Cashier.' : 'Every recorded payment, newest first: tuition payments and document fees.'}
      load={paymentService.getTransactions}
      columns={[
        { key: 'reference', label: 'Transaction', sortable: true },
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description' },
        { key: 'method', label: 'Method' },
        { key: 'amount', label: 'Amount', sortable: true, render: money('amount') },
        { key: 'balanceAfter', label: 'Balance after', render: (t) => (t.balanceAfter == null ? '—' : peso(t.balanceAfter)) },
        { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      ]}
      searchKeys={['reference', 'studentId', 'studentName', 'description']}
      searchPlaceholder="Search transaction or student"
      filter={{ key: 'status', options: TRANSACTION_STATUSES }}
    />
  )
}

