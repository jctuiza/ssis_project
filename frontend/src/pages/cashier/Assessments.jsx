import ResourcePage from '../../components/dashboard/ResourcePage'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p></div>)
const money = (key) => (row) => peso(row[key])

export default function Assessments() {
  return (
    <ResourcePage
      eyebrow="Assessments"
      title="Assessments"
      description="Tuition and fee assessment for the current term."
      load={paymentService.getAssessments}
      columns={[
        { key: 'code', label: 'Assessment', sortable: true },
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'term', label: 'Term' },
        { key: 'tuition', label: 'Tuition', render: money('tuition') },
        { key: 'misc', label: 'Misc. fees', render: money('misc') },
        { key: 'total', label: 'Total', sortable: true, render: money('total') },
      ]}
      searchKeys={['code', 'studentId', 'studentName']}
      searchPlaceholder="Search Student ID or name"
    />
  )
}

// Record a full or partial (installment) tuition payment received face-to-face.
// The balance, status, clearance, payment history and the student's notifications update everywhere.

