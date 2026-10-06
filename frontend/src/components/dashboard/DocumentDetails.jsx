import InfoGrid from '../common/InfoGrid'
import StatusBadge from '../common/StatusBadge'
import WorkflowSteps from './WorkflowSteps'
import { peso } from '../../utils/format'

export default function DocumentDetails({ request, showStudent = false }) {
  const items = [
    { label: 'Reference no.', value: request.ref },
    { label: 'Document', value: request.type },
    ...(showStudent ? [{ label: 'Student', value: `${request.studentName} (${request.studentId})` }] : []),
    { label: 'Date requested', value: request.date },
    { label: 'Status', value: <StatusBadge status={request.status} /> },
    { label: 'Purpose', value: request.purpose },
    { label: 'Fee', value: peso(request.fee) },
    { label: 'Payment status', value: <StatusBadge status={request.feeStatus} /> },
    { label: 'Processing time', value: request.processing },
  ]
  return (
    <div className="space-y-5">
      <WorkflowSteps status={request.status} />
      {request.status === 'Pending Payment' && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Approved. {showStudent ? 'Waiting for the Cashier to record the payment.' : `Please pay ${peso(request.fee)} in person at the Cashier's Office.`}
        </p>
      )}
      <InfoGrid items={items} />
      <InfoGrid items={[{ label: 'Remarks', value: request.remarks || 'No remarks yet.' }]} columns="" />
    </div>
  )
}