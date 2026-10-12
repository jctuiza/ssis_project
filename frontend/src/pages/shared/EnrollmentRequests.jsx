import { useState } from 'react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import DataTable from '../../components/tables/DataTable'
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { peso } from '../../utils/format'
import * as requests from '../../services/shared/enrollmentRequestService'

const YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year'].map(
  (label, index) => ({ value: String(index + 1), label }),
)

const BULK_REVIEW_STATUSES = ['Pending', 'Recommended', 'Approved']

export default function EnrollmentRequests() {
  const { user } = useSession()
  const { notify } = useToast()
  const department = user.role === 'department'

  const [detail, setDetail] = useState(null)
  const [opening, setOpening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [codes, setCodes] = useState([])
  const [recommendation, setRecommendation] = useState('')
  const [yearLevel, setYearLevel] = useState('1')
  const [reviewNotes, setReviewNotes] = useState('')
  const [decision, setDecision] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newRequest, setNewRequest] = useState({
    studentId: '',
    type: 'Returning',
    notes: '',
  })
  const [refresh, setRefresh] = useState(0)
  const [selectedRows, setSelectedRows] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)

  const [bulkDecision, setBulkDecision] = useState(null)
  const [bulkNotes, setBulkNotes] = useState('')

  const open = async (row) => {
    if (opening) return

    setOpening(true)

    try {
      const data = await requests.getRequest(row.id)
      setDetail(data)
      setCodes(data.subjectCodes)
      setRecommendation(data.recommendation)
      setYearLevel(String(data.yearLevel))
      setReviewNotes(data.reviewNotes)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setOpening(false)
    }
  }

  const run = async (action) => {
    if (saving) return

    setSaving(true)

    try {
      await action()
      setDetail(null)
      setDecision(null)
      setCreating(false)
      setRefresh((value) => value + 1)
      notify('Enrollment request updated.')
    } catch (err) {
      notify(err.message, 'error')
      setDecision(null)
    } finally {
      setSaving(false)
    }
  }

  const bulkDecide = (action, rows) => {
    if (department || bulkSaving) return

    const eligibleRows = rows.filter(
      (row) =>
        row.currentTerm && BULK_REVIEW_STATUSES.includes(row.status),
    )

    if (!eligibleRows.length) {
      notify(
        'Select current-term enrollment requests that are awaiting Registrar review.',
        'error',
      )
      return
    }

    setBulkNotes('')
    setBulkDecision({
      action,
      rows: eligibleRows,
      skipped: rows.length - eligibleRows.length,
    })
  }

  const confirmBulkDecision = async () => {
    if (!bulkDecision || bulkSaving) return

    if (!bulkNotes.trim()) {
      notify('Registrar remarks are required.', 'error')
      return
    }

    const { action, rows, skipped } = bulkDecision

    setBulkSaving(true)

    let succeeded = 0
    const failures = []

    try {
      for (const row of rows) {
        try {
          await requests.decide(row.id, {
            action,
            yearLevel: Number(row.yearLevel) || 1,
            reviewNotes: bulkNotes.trim(),
          })
          succeeded += 1
        } catch (err) {
          failures.push(`${row.studentId}: ${err.message}`)
        }
      }

      setBulkDecision(null)
      setBulkNotes('')
      setSelectedRows([])
      setRefresh((value) => value + 1)

      notify(
        `${succeeded} enrollment request(s) ${
          action === 'Return' ? 'returned' : 'rejected'
        }. ${failures.length} failed. ${skipped} skipped.`,
        failures.length || skipped ? 'error' : 'success',
      )

      if (failures.length) {
        console.warn('Bulk enrollment decision results:', failures)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  const editable =
    detail &&
    detail.currentTerm &&
    ['Pending', 'Recommended', ...(!department ? ['Approved'] : [])].includes(
      detail.status,
    )

  return (
    <>
      <ResourcePage
        title="Existing student enrollment requests"
        eyebrow="Enrollment"
        description={
          department
            ? 'Review academic records and recommend active-term subjects for irregular and returning students in your department.'
            : 'Review Department recommendations and approve irregular or returning subject assignments using the existing Student ID.'
        }
        load={requests.getAll}
        deps={[refresh]}
        rowKey="id"
        searchKeys={['studentId', 'studentName', 'program', 'type', 'status']}
        columns={[
          { key: 'studentId', label: 'Student ID' },
          { key: 'studentName', label: 'Student' },
          { key: 'type', label: 'Type' },
          { key: 'classification', label: 'Classification' },
          { key: 'program', label: 'Program' },
          { key: 'yearLevel', label: 'Year level' },
          { key: 'term', label: 'Term' },
          { key: 'status', label: 'Status' },
        ]}
        selectable={!department}
        selectedKeys={selectedRows.map((row) => row.id)}
        onSelectionChange={setSelectedRows}
        canSelectRow={(row) =>
          !department &&
          !bulkSaving &&
          row.currentTerm &&
          BULK_REVIEW_STATUSES.includes(row.status)
        }
        bulkActions={
          department
            ? []
            : [
                {
                  label: bulkSaving ? 'Processing…' : 'Return selected',
                  disabled: bulkSaving || saving,
                  onClick: (rows) => bulkDecide('Return', rows),
                },
                {
                  label: 'Reject selected',
                  variant: 'danger',
                  disabled: bulkSaving || saving,
                  onClick: (rows) => bulkDecide('Reject', rows),
                },
              ]
        }
        headerAction={
          !department && (
            <Button
              onClick={() => {
                setNewRequest({
                  studentId: '',
                  type: 'Returning',
                  notes: '',
                })
                setCreating(true)
              }}
            >
              Request for existing student
            </Button>
          )
        }
        actions={(row) => (
          <Button
            size="sm"
            variant="ghost"
            disabled={opening || bulkSaving}
            onClick={() => open(row)}
          >
            Review
          </Button>
        )}
        empty="No existing-student enrollment requests."
      />

      <Modal
        open={Boolean(detail)}
        size="lg"
        title="Review enrollment request"
        onClose={() => !saving && setDetail(null)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDetail(null)}
            >
              Close
            </Button>

            {editable && department && (
              <Button
                loading={saving}
                disabled={
                  detail.eligible === false ||
                  !codes.length ||
                  !recommendation.trim()
                }
                onClick={() =>
                  run(() =>
                    requests.recommend(detail.id, {
                      subjectCodes: codes,
                      recommendation,
                    }),
                  )
                }
              >
                Recommend subjects
              </Button>
            )}

            {editable && !department && (
              <>
                <Button
                  variant="outline"
                  disabled={saving || !reviewNotes.trim()}
                  onClick={() => setDecision('Return')}
                >
                  Return for correction
                </Button>
                <Button
                  variant="outline"
                  disabled={saving || !reviewNotes.trim()}
                  onClick={() => setDecision('Reject')}
                >
                  Reject
                </Button>
                <Button
                  disabled={
                    detail.eligible === false ||
                    saving ||
                    detail.status !== 'Recommended' ||
                    detail.pendingOffices.length > 0 ||
                    !reviewNotes.trim()
                  }
                  onClick={() => setDecision('Confirm')}
                >
                  Approve subjects
                </Button>
              </>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="space-y-1 text-sm">
              {detail.eligible === false && (
                <p role="alert" className="text-amber-600">
                  The student no longer qualifies for this request type. Return
                  or reject it and review the current academic records.
                </p>
              )}
              <p>
                <strong>{detail.studentName}</strong> · {detail.studentId}
              </p>
              <p>
                {detail.type} · {detail.status} · {detail.term}
              </p>
              <p>
                {detail.program} · Year {detail.yearLevel} · Account{' '}
                {detail.accountStatus}
              </p>
              <p>Student reason: {detail.notes}</p>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Academic history</h4>
              <DataTable
                rows={detail.records.map((row) => ({
                  ...row,
                  id: `${row.academicYear}-${row.semester}-${row.code}`,
                }))}
                rowKey="id"
                pageSize={5}
                columns={[
                  { key: 'code', label: 'Subject' },
                  { key: 'academicYear', label: 'Academic year' },
                  { key: 'semester', label: 'Semester' },
                  { key: 'grade', label: 'Grade' },
                  { key: 'status', label: 'Status' },
                ]}
                empty="No previous grade records."
              />
            </div>

            <div className="text-sm">
              <h4 className="font-semibold">Existing assessments</h4>
              {detail.assessments.map((row) => (
                <p key={row.term}>
                  {row.term}: {peso(row.balance)}
                </p>
              ))}
            </div>

            {detail.pendingOffices.length > 0 && (
              <p className="text-sm text-amber-600">
                Complete non-Cashier clearance before confirmation:{' '}
                {detail.pendingOffices.join(', ')}.
              </p>
            )}

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Eligible subjects in the active semester
              </h4>
              <p className="mb-3 text-xs text-slate-500">
                Current-level subjects and unresolved lower-level subjects are
                offered for irregular students. Returning students may also be
                reviewed for missing lower-level subjects. Passed subjects are
                excluded. Check prerequisites, schedule conflicts and permitted
                load under school policy before recommending.
              </p>

              <div className="space-y-2">
                {detail.subjects.map((subject) => (
                  <label
                    key={subject.code}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={codes.includes(subject.code)}
                      disabled={
                        detail.eligible === false ||
                        !department ||
                        !editable ||
                        saving
                      }
                      onChange={(event) =>
                        setCodes((previous) =>
                          event.target.checked
                            ? [...previous, subject.code]
                            : previous.filter((code) => code !== subject.code),
                        )
                      }
                    />
                    <span>
                      {subject.code} — {subject.name}
                      <span className="block text-xs text-slate-500">
                        Year {subject.yearLevel} · {subject.units} units ·{' '}
                        {subject.retake ? 'Retake' : 'New subject'}
                      </span>
                    </span>
                  </label>
                ))}

                {!detail.subjects.length && (
                  <p className="text-sm text-slate-500">
                    No eligible subjects. Check Department program and active-term
                    assignments.
                  </p>
                )}
              </div>

              {detail.subjectCodes.some(
                (code) => !detail.subjects.some((subject) => subject.code === code),
              ) && (
                <p role="alert" className="mt-3 text-sm text-amber-600">
                  Some recommended subjects are no longer eligible. The
                  Department must revise the list before confirmation.
                </p>
              )}
            </div>

            <Textarea
              label="Department recommendation / justification"
              value={recommendation}
              maxLength={2000}
              disabled={
                detail.eligible === false ||
                !department ||
                !editable ||
                saving
              }
              onChange={(event) => setRecommendation(event.target.value)}
            />

            {!department && (
              <>
                <Select
                  label="Reviewed year level"
                  value={yearLevel}
                  options={YEARS}
                  disabled={!editable || saving}
                  onChange={(event) => setYearLevel(event.target.value)}
                />
                <Textarea
                  label="Registrar review remarks"
                  value={reviewNotes}
                  maxLength={2000}
                  disabled={!editable || saving}
                  onChange={(event) => setReviewNotes(event.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Year placement requires review; this does not change
                  historical enrollments. Returning-account activation occurs
                  only on confirmation. Existing Student ID and password are
                  retained; use the existing account reset process if needed.
                </p>
              </>
            )}

            {detail.reviewNotes && department && (
              <p className="text-sm">
                Registrar remarks: {detail.reviewNotes}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(bulkDecision)}
        size="lg"
        title={
          bulkDecision?.action === 'Return'
            ? 'Return selected enrollment requests'
            : 'Reject selected enrollment requests'
        }
        description="Review the action and provide remarks before continuing."
        onClose={() => {
          if (!bulkSaving) setBulkDecision(null)
        }}
        footer={
          <>
            <Button
              variant="outline"
              disabled={bulkSaving}
              onClick={() => setBulkDecision(null)}
            >
              Cancel
            </Button>

            <Button
              variant={bulkDecision?.action === 'Reject' ? 'danger' : undefined}
              loading={bulkSaving}
              disabled={!bulkNotes.trim() || !bulkDecision?.rows.length}
              onClick={confirmBulkDecision}
            >
              {bulkDecision?.action === 'Return'
                ? 'Confirm return'
                : 'Confirm rejection'}
            </Button>
          </>
        }
      >
        {bulkDecision && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <span className="text-lg font-semibold">
                    {bulkDecision.rows.length}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {bulkDecision.rows.length} enrollment request(s) selected
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {bulkDecision.action === 'Return'
                      ? 'The selected requests will be returned for correction.'
                      : 'The selected requests will be rejected.'}
                  </p>

                  {bulkDecision.skipped > 0 && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
                      {bulkDecision.skipped} ineligible record(s) will be skipped.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Registrar review remarks <span className="text-rose-500">*</span>
              </p>

              <Textarea
                value={bulkNotes}
                onChange={(event) => setBulkNotes(event.target.value)}
                placeholder={
                  bulkDecision.action === 'Return'
                    ? 'Explain the corrections required from the student or department'
                    : 'Explain why these enrollment requests are being rejected'
                }
                disabled={bulkSaving}
                maxLength={2000}
              />

              <p className="mt-1 text-xs text-slate-500">
                These remarks will be applied to every selected request.
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each request is processed individually. If one request fails, the
              remaining requests will still be processed.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        open={Boolean(decision)}
        title={
          decision === 'Confirm'
            ? 'Confirm existing-student enrollment'
            : `${decision} enrollment request`
        }
        message={
          decision === 'Confirm'
            ? 'Confirm the reviewed year level and Department subjects? This approves the subject list and assessment. The student must complete all clearances and confirm enrollment in the Student Portal.'
            : 'Save the review remarks and notify the student?'
        }
        confirmLabel="Confirm"
        loading={saving}
        onCancel={() => !saving && setDecision(null)}
        onConfirm={() =>
          run(() =>
            requests.decide(detail.id, {
              action: decision,
              yearLevel: Number(yearLevel),
              reviewNotes,
            }),
          )
        }
      />

      <Modal
        open={creating}
        title="Request enrollment for an existing student"
        onClose={() => !saving && setCreating(false)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={
                !newRequest.studentId.trim() || !newRequest.notes.trim()
              }
              onClick={() => run(() => requests.submit(newRequest))}
            >
              Submit request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Existing Student ID"
            value={newRequest.studentId}
            disabled={saving}
            onChange={(event) =>
              setNewRequest({ ...newRequest, studentId: event.target.value })
            }
          />
          <Select
            label="Request type"
            value={newRequest.type}
            options={['Irregular', 'Returning']}
            disabled={saving}
            onChange={(event) =>
              setNewRequest({ ...newRequest, type: event.target.value })
            }
          />
          <Textarea
            label="Reason / return details"
            maxLength={2000}
            value={newRequest.notes}
            disabled={saving}
            onChange={(event) =>
              setNewRequest({ ...newRequest, notes: event.target.value })
            }
          />
          <p className="text-sm text-slate-500">
            Use this when the student cannot access the portal. This does not
            create a new student account or reactivate the account until
            confirmation.
          </p>
        </div>
      </Modal>
    </>
  )
}