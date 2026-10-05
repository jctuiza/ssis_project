import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import InfoGrid from '../../components/common/InfoGrid'
import StatusBadge from '../../components/common/StatusBadge'
import AsyncView from '../../components/common/AsyncView'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import * as enrollmentService from '../../services/enrollmentService'

export default function StudentEnrollment() {
  const { user } = useSession()
  const { notify } = useToast()
  const { data, loading, error } = useService(() => enrollmentService.getForStudent(user.id), [user.id])
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await enrollmentService.submit()
      notify('Enrollment request submitted. The Registrar will review it.')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enrollment"/>
      <AsyncView loading={loading} error={error}>
        {data && (
          <>
            <Card title="Enrollment information">
              <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3" items={[
                { label: 'Academic term', value: data.enrollment?.term },
                { label: 'Enrollment status', value: <StatusBadge status={data.enrollment?.status ?? 'Not Enrolled'} /> },
                { label: 'Program', value: user.program },
                { label: 'Year level', value: user.yearLevel },
                { label: 'Total units', value: data.totalUnits },
                { label: 'Submitted on', value: data.enrollment?.submittedAt },
              ]} />
            </Card>
            {(data.canSubmit || !data.enrollmentOpen) && (
              <Card title="Enrollment request" description={data.enrollmentOpen ? 'Send your enrollment for this term to the Registrar.' : 'Enrollment is closed right now.'}>
                {data.canSubmit
                  ? <Button loading={submitting} onClick={submit}>Submit enrollment request</Button>
                  : <p className="text-sm text-slate-500 dark:text-slate-400">The administrator has closed enrollment. Check the announcements for the next opening.</p>}
              </Card>
            )}
            <Card title="Subjects" padded={false}>
              <DataTable
                rowKey="code"
                rows={data.subjects}
                pageSize={10}
                empty="You are not enrolled in any subjects this term."
                columns={[
                  { key: 'code', label: 'Course code' },
                  { key: 'name', label: 'Subject' },
                  { key: 'units', label: 'Units' },
                  { key: 'schedule', label: 'Schedule' },
                ]}
              />
            </Card>
          </>
        )}
      </AsyncView>
    </div>
  )
}
