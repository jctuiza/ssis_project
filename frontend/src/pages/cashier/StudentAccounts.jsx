import ResourcePage from '../../components/dashboard/ResourcePage'
import StatusBadge from '../../components/ui/StatusBadge'
import { PAYMENT_STATUSES } from '../../config/constants'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p></div>)
const money = (key) => (row) => peso(row[key])

export default function StudentAccounts() {
  return (
    <ResourcePage
      eyebrow="Student Accounts"
      title="Student Accounts"
      description="Balance and payment status for every student."
      load={paymentService.getAssessments}
      columns={[
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'program', label: 'Program' },
        { key: 'total', label: 'Assessed', sortable: true, render: money('total') },
        { key: 'paid', label: 'Paid', sortable: true, render: money('paid') },
        { key: 'balance', label: 'Balance', sortable: true, render: money('balance') },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
      ]}
      searchKeys={['studentId', 'studentName', 'program']}
      searchPlaceholder="Search Student ID or name"
      filter={{ key: 'status', options: PAYMENT_STATUSES }}
    />
  )
}


