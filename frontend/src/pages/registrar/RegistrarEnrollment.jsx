import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import AsyncView from '../../components/common/AsyncView'
import Button from '../../components/common/Button'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import StatusBadge from '../../components/common/StatusBadge'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import { ENROLLMENT_STATUSES } from '../../config/constants'
import * as enrollmentService from '../../services/enrollmentService'

export default function RegistrarEnrollment() {
  const { notify } = useToast()
  const { data, loading, error } = useService(enrollmentService.getAll)
  const [pending, setPending] = useState(null) // { enrollment, status }
  const [saving, setSaving] = useState(false)

  const confirm = async () => {
    setSaving(true)
    try {
      await enrollmentService.updateStatus(pending.enrollment.id, pending.status)
      notify(`${pending.enrollment.studentName}'s enrollment was ${pending.status === 'Enrolled' ? 'approved' : 'rejected'}.`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
      setPending(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enrollment" title="Enrollment" description="Review enrollment requests. Approving creates the student's assessment for the Cashier." />
      <AsyncView loading={loading} error={error}>
        {data && (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'studentId', label: 'Student ID', sortable: true },
                { key: 'studentName', label: 'Name', sortable: true },
                { key: 'program', label: 'Program' },
                { key: 'yearLevel', label: 'Year level' },
                { key: 'units', label: 'Units' },
                { key: 'submittedAt', label: 'Submitted' },
                { key: 'status', label: 'Status', render: (e) => <StatusBadge status={e.status} /> },
              ]}
              rows={data}
              searchKeys={['studentId', 'studentName', 'program']}
              searchPlaceholder="Search Student ID or name"
              filter={{ key: 'status', options: ENROLLMENT_STATUSES }}
              actions={(e) => e.status === 'Pending' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setPending({ enrollment: e, status: 'Enrolled' })}>Approve</Button>
                  <Button variant="ghost" size="sm" className="!text-rose-500" onClick={() => setPending({ enrollment: e, status: 'Rejected' })}>Reject</Button>
                </>
              )}
            />
          </Card>
        )}
      </AsyncView>
      <ConfirmationDialog
        open={Boolean(pending)}
        title={pending?.status === 'Enrolled' ? 'Approve enrollment' : 'Reject enrollment'}
        message={pending ? `${pending.status === 'Enrolled' ? 'Approve' : 'Reject'} the enrollment of ${pending.enrollment.studentName}? The student will see the update right away.` : ''}
        confirmLabel={pending?.status === 'Enrolled' ? 'Approve' : 'Reject'}
        danger={pending?.status === 'Rejected'}
        loading={saving}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
