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

export default function StaffDocuments({
  title = 'Document Requests',
  description,
}) {
  const { user } = useSession()
  const { notify } = useToast()
  const departmentId = user.departmentId ?? undefined
  const canProcess = can(user, 'documents.process')
  const [refresh, setRefresh] = useState(0)

  const { data, loading, error } = useService(
    () => documentService.getAll({ departmentId }),
    [departmentId, refresh],
    'pages/shared/StaffDocuments.jsx:1',
  )

  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [prepared, setPrepared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkTargetRows, setBulkTargetRows] = useState([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkRemarks, setBulkRemarks] = useState('')

  const open = (request) => {
    setSelected(request)
    setStatus(request.status)
    setRemarks(request.remarks)
    setPrepared(false)
  }

  const save = async () => {
    if (!selected || saving) return

    setSaving(true)

    try {
      await documentService.updateStatus(selected.ref, {
        status,
        remarks,
        prepared,
      })

      notify(
        status === 'Approved'
          ? `${selected.ref} approved and sent to the Cashier.`
          : `${selected.ref} updated to ${status}.`,
      )

      setSelected(null)
      setRefresh((value) => value + 1)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const getCommonBulkStatuses = (rows) =>
  DOCUMENT_STATUSES.filter((candidate) =>
    rows.every((row) =>
      nextDocumentStatuses(canProcess, row.status).includes(candidate),
    ),
  ).filter((candidate) => rows.some((row) => row.status !== candidate))

  const bulkUpdate = (rows) => {
    if (!rows.length || bulkSaving) return

    const commonStatuses = getCommonBulkStatuses(rows)

    if (!commonStatuses.length) {
      notify(
        'These requests do not share a common valid status transition. Select requests at a compatible stage.',
        'error',
      )
      return
    }

    setBulkTargetRows(rows)
    setBulkStatus(commonStatuses[0])
    setBulkRemarks('')
    setBulkModalOpen(true)
  }

  const saveBulkUpdate = async () => {
    if (bulkSaving || !bulkTargetRows.length) return

    const commonStatuses = getCommonBulkStatuses(bulkTargetRows)

    if (!commonStatuses.includes(bulkStatus)) {
      notify(
        'The selected status is not valid for every selected request.',
        'error',
      )
      return
    }

    setBulkSaving(true)

    let succeeded = 0
    const failures = []

    try {
      for (const row of bulkTargetRows) {
        try {
          await documentService.updateStatus(row.ref, {
            status: bulkStatus,
            remarks: bulkRemarks.trim(),
            prepared: false,
          })
          succeeded += 1
        } catch (err) {
          failures.push(`${row.ref}: ${err.message}`)
        }
      }

      setBulkModalOpen(false)
      setBulkTargetRows([])
      setSelectedRows([])
      setRefresh((value) => value + 1)

      notify(
        `${succeeded} document request(s) updated. ${failures.length} failed.`,
        failures.length ? 'error' : 'success',
      )

      if (failures.length) {
        console.warn('Bulk document update results:', failures)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  const options = selected
    ? nextDocumentStatuses(canProcess, selected.status).map((value) => ({
        value,
        label:
          value === 'Approved' ? 'Approved – send to Cashier' : value,
      }))
    : []

  const columns = [
    { key: 'ref', label: 'Reference', sortable: true },
    {
      key: 'studentName',
      label: 'Student',
      sortable: true,
      render: (request) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {request.studentName}
          </p>
          <p className="text-xs text-slate-400">{request.studentId}</p>
        </div>
      ),
    },
    { key: 'type', label: 'Document' },
    { key: 'date', label: 'Requested' },
    {
      key: 'feeStatus',
      label: 'Payment',
      render: (request) => <StatusBadge status={request.feeStatus} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (request) => <StatusBadge status={request.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={title}
        title={title}
        description={description}
      />

      <AsyncView
        loading={loading}
        error={error}
        hasData={data != null}
        skeleton={<TableSkeleton columns={6} search filters actions />}
      >
        {data && (
          <Card padded={false}>
            <DataTable
              columns={columns}
              rows={data}
              rowKey="ref"
              searchKeys={['ref', 'studentName', 'studentId', 'type']}
              searchPlaceholder="Search reference, student or document"
              filter={{ key: 'status', options: DOCUMENT_STATUSES }}
              selectable
              selectedKeys={selectedRows.map((row) => row.ref)}
              onSelectionChange={setSelectedRows}
              canSelectRow={() => !bulkSaving}
              bulkActions={[
                {
                  label: bulkSaving ? 'Updating…' : 'Update selected',
                  disabled: bulkSaving || saving,
                  onClick: bulkUpdate,
                },
              ]}
              actions={(request) => (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving || bulkSaving}
                  onClick={() => open(request)}
                >
                  Manage
                </Button>
              )}
            />
          </Card>
        )}
      </AsyncView>

      <Modal
        open={Boolean(selected)}
        size="lg"
        title={selected ? `${selected.type} · ${selected.ref}` : ''}
        description="Review the request, update its status and leave remarks for the student."
        onClose={() => !saving && setSelected(null)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Update request
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <DocumentDetails request={selected} showStudent />

            <div className="grid gap-4 border-t border-slate-100 pt-5 dark:border-white/10">
              <Select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={options}
              />

              {status === 'Approved' && (
                <>
                  <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                    Approving sends this request to the Cashier. The student
                    pays the fee in person, then the request moves on
                    automatically.
                  </p>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={prepared}
                      onChange={(event) => setPrepared(event.target.checked)}
                      className="h-4 w-4 accent-violet-500"
                    />
                    The document is already prepared (mark it ready for release
                    as soon as the fee is paid)
                  </label>
                </>
              )}

              {selected.status === 'Pending Payment' && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Waiting for the Cashier to record the student's payment. The
                  request advances automatically once it is recorded.
                </p>
              )}

              {!canProcess && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your role can start a review or reject a request. The
                  Registrar approves and releases the document.
                </p>
              )}

              <Textarea
                label="Remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add a note the student will see"
              />
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={bulkModalOpen}
        size="lg"
        title="Update selected document requests"
        description={`Update ${bulkTargetRows.length} selected document request(s).`}
        onClose={() => {
          if (!bulkSaving) setBulkModalOpen(false)
        }}
        footer={
          <>
            <Button
              variant="outline"
              disabled={bulkSaving}
              onClick={() => setBulkModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              loading={bulkSaving}
              disabled={!bulkTargetRows.length || !bulkStatus}
              onClick={saveBulkUpdate}
            >
              Update {bulkTargetRows.length} request(s)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-500/5 p-3 text-sm text-slate-600 dark:text-slate-300">
            Only statuses allowed for every selected request are available.
            Each request will be updated individually.
          </div>

          <Select
            label="New status"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
            options={getCommonBulkStatuses(bulkTargetRows).map((value) => ({
              value,
              label:
                value === 'Approved'
                  ? 'Approved – send to Cashier'
                  : value,
            }))}
          />

          {bulkStatus === 'Approved' && (
            <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Bulk approval does not mark documents as prepared. Use the individual
              Manage action if you need to mark a document ready for release.
            </p>
          )}

          <Textarea
            label="Remarks"
            value={bulkRemarks}
            onChange={(event) => setBulkRemarks(event.target.value)}
            placeholder="Enter remarks to apply to all selected requests"
          />
        </div>
      </Modal>
    </div>
  )
}