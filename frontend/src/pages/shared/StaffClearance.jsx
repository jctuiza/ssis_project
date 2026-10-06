import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import AsyncView from '../../components/common/AsyncView'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import { Textarea } from '../../components/common/Input'
import StatusBadge from '../../components/common/StatusBadge'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { CLEARANCE_STATUSES } from '../../config/constants'
import * as clearanceService from '../../services/clearanceService'

// `office` is decided by the role's permission (clearance.registrar or clearance.department).
// Staff tied to a department only see students of that department.
export default function StaffClearance({ office, description }) {
  const { user } = useSession()
  const { notify } = useToast()
  const departmentId = user.departmentId ?? undefined
  const { data, loading, error } = useService(() => clearanceService.getByOffice(office, { departmentId }), [office, departmentId])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const open = (c) => { setSelected(c); setStatus(c.status); setRemarks(c.remarks) }
  const save = async () => {
    setSaving(true)
    try {
      await clearanceService.update(selected.id, { status, remarks })
      notify(`${selected.studentName} marked as ${status.toLowerCase()}.`)
      setSelected(null)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Clearance" title={`${office} Clearance`} description={description} />
      <AsyncView loading={loading} error={error}>
        {data && (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'studentId', label: 'Student ID', sortable: true },
                { key: 'studentName', label: 'Name', sortable: true },
                { key: 'program', label: 'Program' },
                { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                { key: 'remarks', label: 'Remarks', render: (c) => <span className="text-slate-500">{c.remarks || '—'}</span> },
                { key: 'updatedAt', label: 'Updated' },
              ]}
              rows={data}
              searchKeys={['studentId', 'studentName', 'program']}
              searchPlaceholder="Search Student ID or name"
              filter={{ key: 'status', options: CLEARANCE_STATUSES }}
              actions={(c) => <Button variant="ghost" size="sm" onClick={() => open(c)}>Update</Button>}
            />
          </Card>
        )}
      </AsyncView>

      <Modal
        open={Boolean(selected)}
        title={selected ? `${office} clearance` : ''}
        description={selected ? `${selected.studentName} · ${selected.studentId}` : ''}
        onClose={() => setSelected(null)}
        footer={<><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save clearance</Button></>}
      >
        <div className="grid gap-4">
          <Select label="Clearance status" value={status} onChange={(e) => setStatus(e.target.value)} options={CLEARANCE_STATUSES} />
          <Textarea label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Explain what the student still needs to do" />
        </div>
      </Modal>
    </div>
  )
}
