import { DataLoading } from '../../context/DataLoading'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog'
import { useToast } from '../../context/toast'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import AsyncView from '../../components/feedback/AsyncView'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { peso } from '../../utils/format'
import * as enrollmentService from '../../services/shared/enrollmentService'

export default function StudentEnrollment() {
  const { user } = useSession()
  const { notify } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data: received, loading, error, reload } = useService(() => enrollmentService.getForStudent(user.id), [user.id], "pages/student/StudentEnrollment.jsx:1")
  const waiting = loading && received == null
  const data = received ?? { term: '', totalUnits: null, subjects: [], enrollmentOpen: false, pendingOffices: [] }
  const enroll = async () => {
    setSaving(true)
    try {
      await enrollmentService.submit()
      setConfirming(false)
      await reload()
      notify('Enrollment confirmed successfully.')
    } catch (err) {
      setConfirming(false)
      notify(err.message, 'error')
      await reload()
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enrollment"/>
      <DataLoading value={waiting}>
      {error && <p role="alert" className="text-sm text-rose-500">{error.message} <button className="underline" onClick={reload}>Retry</button></p>}
        {data && (
          <>
            <Card title="Enrollment information">
              <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3" items={[
                { label: 'Academic term', value: data.enrollment?.term ?? data.term },
                { label: 'Enrollment status', value: <StatusBadge status={data.enrollment?.status ?? 'Not Enrolled'} /> },
                { label: 'Program', value: data.enrollment?.program ?? user.program },
                { label: 'Year level', value: data.enrollment?.yearLevel ?? user.yearLevel },
                { label: 'Total units', value: data.totalUnits },
                { label: 'Submitted on', value: data.enrollment?.submittedAt },
                { label: 'Tuition', value: data.assessment ? data.assessment.tuitionPending ? 'Awaiting subjects' : peso(data.assessment.tuition) : 'Not assessed' },
                { label: 'Miscellaneous fees', value: data.assessment ? peso(data.assessment.misc) : 'Not assessed' },
                { label: 'Outstanding assessed balance', value: data.assessment ? peso(data.assessment.balance) : 'Not assessed' },
              ]} />
            </Card>
            {received && data.enrollment?.status !== 'Enrolled' && <Card title="Enrollment confirmation">
              <p className="text-sm text-slate-500 dark:text-slate-400">{!data.enrollmentOpen ? 'Enrollment is currently closed.' : data.pendingOffices?.length ? `Complete clearance from: ${data.pendingOffices.join(', ')}. Please clear all required clearances before enrolling.` : 'All offices have cleared you. Confirm enrollment below once your subject assignment is ready.'}</p>
              {data.canSubmit && <Button className="mt-4" onClick={() => setConfirming(true)}>Enroll</Button>}
            </Card>}
            <Card title="Subjects" padded={false}>
              <DataTable
                rowKey="code"
                rows={data.subjects}
                pageSize={10}
                empty="No subjects match your program, year level, semester and academic year. Contact your Department."
                loading={waiting}
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
      </DataLoading>
      <ConfirmationDialog open={confirming} title="Confirm enrollment" message="Do you want to enroll for the current academic term?" confirmLabel="Confirm" loading={saving} onConfirm={enroll} onCancel={() => { if (!saving) setConfirming(false) }} />
    </div>
  )
}

