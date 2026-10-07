import TableSkeleton from '../../components/loading/TableSkeleton'
import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import AsyncView from '../../components/feedback/AsyncView'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Select from '../../components/forms/Select'
import { Textarea } from '../../components/forms/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import DocumentDetails from '../../components/dashboard/DocumentDetails'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { can } from '../../config/permissions'
import { DOCUMENT_STATUSES, nextDocumentStatuses } from '../../config/constants'
import * as documentService from '../../services/shared/documentService'

// Registrar (documents.process): review, approve (forwards to the Cashier), reject, process, release.
// Department (documents.review): start a review or reject only.
// Staff tied to a department only see requests of that department.
export default function StaffDocuments({ title = 'Document Requests', description }) {
  const { user } = useSession()
  const { notify } = useToast()
  const departmentId = user.departmentId ?? undefined
  const canProcess = can(user, 'documents.process')
  const { data, loading, error } = useService(() => documentService.getAll({ departmentId }), [departmentId], "pages/shared/StaffDocuments.jsx:1")
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [prepared, setPrepared] = useState(false)
  const [saving, setSaving] = useState(false)

  const open = (r) => { setSelected(r); setStatus(r.status); setRemarks(r.remarks); setPrepared(false) }
  const save = async () => {
    setSaving(true)
    try {
      await documentService.updateStatus(selected.ref, { status, remarks, prepared })
      notify(status === 'Approved' ? `${selected.ref} approved and sent to the Cashier.` : `${selected.ref} updated to ${status}.`)
      setSelected(null)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const options = selected
    ? nextDocumentStatuses(canProcess, selected.status).map((s) => ({ value: s, label: s === 'Approved' ? 'Approved – send to Cashier' : s }))
    : []

  const columns = [
    { key: 'ref', label: 'Reference', sortable: true },
    { key: 'studentName', label: 'Student', sortable: true, render: (r) => (<div><p className="font-medium text-slate-900 dark:text-white">{r.studentName}</p><p className="text-xs text-slate-400">{r.studentId}</p></div>) },
    { key: 'type', label: 'Document' },
    { key: 'date', label: 'Requested' },
    { key: 'feeStatus', label: 'Payment', render: (r) => <StatusBadge status={r.feeStatus} /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={title} title={title} description={description} />
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<TableSkeleton columns={6} search filters actions />}>
        {data && (
          <Card padded={false}>
            <DataTable
              columns={columns}
              rows={data}
              rowKey="ref"
              searchKeys={['ref', 'studentName', 'studentId', 'type']}
              searchPlaceholder="Search reference, student or document"
              filter={{ key: 'status', options: DOCUMENT_STATUSES }}
              actions={(r) => <Button variant="ghost" size="sm" onClick={() => open(r)}>Manage</Button>}
            />
          </Card>
        )}
      </AsyncView>

      <Modal
        open={Boolean(selected)}
        size="lg"
        title={selected ? `${selected.type} · ${selected.ref}` : ''}
        description="Review the request, update its status and leave remarks for the student."
        onClose={() => setSelected(null)}
        footer={<><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} onClick={save}>Update request</Button></>}
      >
        {selected && (
          <div className="space-y-5">
            <DocumentDetails request={selected} showStudent />
            <div className="grid gap-4 border-t border-slate-100 pt-5 dark:border-white/10">
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={options} />
              {status === 'Approved' && (
                <>
                  <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                    Approving sends this request to the Cashier. The student pays the fee in person, then the request moves on automatically.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={prepared} onChange={(e) => setPrepared(e.target.checked)} className="h-4 w-4 accent-violet-500" />
                    The document is already prepared (mark it ready for release as soon as the fee is paid)
                  </label>
                </>
              )}
              {selected.status === 'Pending Payment' && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Waiting for the Cashier to record the student's payment. The request advances automatically once it is recorded.</p>}
              {!canProcess && <p className="text-xs text-slate-500 dark:text-slate-400">Your role can start a review or reject a request. The Registrar approves and releases the document.</p>}
              <Textarea label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add a note the student will see" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

