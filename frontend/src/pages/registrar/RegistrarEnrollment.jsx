import AdmissionApplications from './AdmissionApplications'
import ResourcePage from '../../components/dashboard/ResourcePage'
import StatusBadge from '../../components/ui/StatusBadge'
import { ENROLLMENT_STATUSES } from '../../config/constants'
import * as enrollmentService from '../../services/shared/enrollmentService'

export default function RegistrarEnrollment() {
  return <div className="space-y-8"><AdmissionApplications /><ResourcePage eyebrow="Enrollment" title="Enrollment"
    description="Students confirm enrollment after completing all required office clearances."
    load={enrollmentService.getAll}
    columns={[
      { key: 'studentId', label: 'Student ID', sortable: true },
      { key: 'studentName', label: 'Name', sortable: true },
      { key: 'program', label: 'Program' }, { key: 'yearLevel', label: 'Year level' },
      { key: 'units', label: 'Units' }, { key: 'submittedAt', label: 'Enrolled on' },
      { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
    ]}
    searchKeys={['studentId', 'studentName', 'program']} searchPlaceholder="Search Student ID or name"
    filter={{ key: 'status', options: ENROLLMENT_STATUSES }} /></div>
}
