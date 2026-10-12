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
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { CLEARANCE_STATUSES } from '../../config/constants'
import * as clearanceService from '../../services/shared/clearanceService'

// Staff may only update clearances allowed by their role.
// Department staff are scoped to students in their department.
export default function StaffClearance({ office, description }) {
  const { user } = useSession()
  const { notify } = useToast()
  const departmentId = user.departmentId ?? undefined
  const [refresh, setRefresh] = useState(0)
  const { data, loading, error } = useService(
    () => clearanceService.getByOffice(office, { departmentId }),
    [office, departmentId, refresh],
    'pages/shared/StaffClearance.jsx:1',
  )

  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkTargetRows, setBulkTargetRows] = useState([])
  const [bulkStatus, setBulkStatus] = useState(
    CLEARANCE_STATUSES.includes('Cleared')
      ? 'Cleared'
      : CLEARANCE_STATUSES[0] ?? '',
  )
  const [bulkRemarks, setBulkRemarks] = useState('')

  const open = (clearance) => {
    setSelected(clearance)
    setStatus(clearance.status)
    setRemarks(clearance.remarks ?? '')
  }

  const save = async () => {
    if (!selected || saving) return

    setSaving(true)

    try {
      await clearanceService.update(selected.id, { status, remarks })
      notify(`${selected.studentName} marked as ${status.toLowerCase()}.`)
      setSelected(null)
      setRefresh((value) => value + 1)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const bulkUpdate = (rows) => {
    if (!rows.length || bulkSaving) return

    setBulkTargetRows(rows)
    setBulkStatus(
      CLEARANCE_STATUSES.includes('Cleared')
        ? 'Cleared'
        : CLEARANCE_STATUSES[0] ?? '',
    )
    setBulkRemarks('')
    setBulkModalOpen(true)
  }

  const saveBulkUpdate = async () => {
    if (bulkSaving || !bulkTargetRows.length) return

    if (!CLEARANCE_STATUSES.includes(bulkStatus)) {
      notify('Please select a valid clearance status.', 'error')
      return
    }

    setBulkSaving(true)

    let succeeded = 0
    const failures = []

    try {
      for (const row of bulkTargetRows) {
        try {
          await clearanceService.update(row.id, {
            status: bulkStatus,
            remarks: bulkRemarks.trim(),
          })
          succeeded += 1
        } catch (err) {
          failures.push(`${row.studentId}: ${err.message}`)
        }
      }

      setBulkModalOpen(false)
      setBulkTargetRows([])
      setSelectedRows([])
      setRefresh((value) => value + 1)

      notify(
        `${succeeded} clearance record(s) updated. ${failures.length} failed.`,
        failures.length ? 'error' : 'success',
      )

      if (failures.length) {
        console.warn('Bulk clearance update results:', failures)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clearance"
        title={`${office} Clearance`}
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
              columns={[
                {
                  key: 'studentId',
                  label: 'Student ID',
                  sortable: true,
                },
                {
                  key: 'studentName',
                  label: 'Name',
                  sortable: true,
                },
                { key: 'program', label: 'Program' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (clearance) => (
                    <StatusBadge status={clearance.status} />
                  ),
                },
                {
                  key: 'remarks',
                  label: 'Remarks',
                  render: (clearance) => (
                    <span className="text-slate-500">
                      {clearance.remarks || '—'}
                    </span>
                  ),
                },
                { key: 'updatedAt', label: 'Updated' },
              ]}
              rows={data}
              searchKeys={['studentId', 'studentName', 'program']}
              searchPlaceholder="Search Student ID or name"
              filter={{ key: 'status', options: CLEARANCE_STATUSES }}
              selectable
              selectedKeys={selectedRows.map((row) => row.id)}
              onSelectionChange={setSelectedRows}
              canSelectRow={() => !bulkSaving}
              bulkActions={[
                {
                  label: bulkSaving ? 'Updating…' : 'Update selected',
                  disabled: bulkSaving || saving,
                  onClick: bulkUpdate,
                },
              ]}
              actions={(clearance) => (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving || bulkSaving}
                  onClick={() => open(clearance)}
                >
                  Update
                </Button>
              )}
            />
          </Card>
        )}
      </AsyncView>

      <Modal
        open={Boolean(selected)}
        title={selected ? `${office} clearance` : ''}
        description={
          selected ? `${selected.studentName} · ${selected.studentId}` : ''
        }
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
              Save clearance
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Select
            label="Clearance status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={CLEARANCE_STATUSES}
          />
          <Textarea
            label="Remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Explain what the student still needs to do"
          />
        </div>
      </Modal>
      <Modal
        open={bulkModalOpen}
        title="Update selected clearances"
        description={`Update ${bulkTargetRows.length} selected clearance record(s).`}
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
              Update {bulkTargetRows.length} record(s)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-500/5 p-3 text-sm text-slate-600 dark:text-slate-300">
            The selected records will receive the same status and remarks.
          </div>

          <Select
            label="Clearance status"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
            options={CLEARANCE_STATUSES}
          />

          <Textarea
            label="Remarks"
            value={bulkRemarks}
            onChange={(event) => setBulkRemarks(event.target.value)}
            placeholder="Enter remarks to apply to all selected records"
          />
        </div>
      </Modal>
    </div>
  )
}