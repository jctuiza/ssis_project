import { DocumentRequestFormSkeleton, DocumentRequestsTableSkeleton } from '../../components/loading/ScreenSkeleton'
import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import AsyncView from '../../components/feedback/AsyncView'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import DocumentDetails from '../../components/dashboard/DocumentDetails'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { DOCUMENT_STATUSES } from '../../config/constants'
import { peso } from '../../utils/format'
import * as documentService from '../../services/shared/documentService'


export default function StudentDocuments() {
  const { user } = useSession()
  const { notify } = useToast()
  const types = useService(documentService.getTypes, [], "pages/student/StudentDocuments.jsx:1")
  const requests = useService(() => documentService.getForStudent(user.id), [user.id], "pages/student/StudentDocuments.jsx:2")
  const [type, setType] = useState('')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false) // confirmation pop-up before submitting
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const chosen = types.data?.find((t) => t.name === type)

  // Step 1: validate, then ask the student to confirm. Nothing is submitted yet.
  const askConfirmation = (e) => {
    e.preventDefault()
    if (!type) return setError('Select a document type.')
    setError('')
    setConfirming(true)
  }

  const cancelConfirmation = () => {
    if (!submitting) setConfirming(false)
  }

  // Step 2: the student pressed "Confirm", so the request is submitted now.
  const confirmSubmit = async () => {
    setSubmitting(true)
    try {
      const created = await documentService.submit({ studentId: user.id, type, purpose })
      setConfirming(false)
      setType('')
      setPurpose('')
      notify(`Request submitted. Your reference number is ${created.ref}.`)
      requests.reload()
    } catch (err) {
      setConfirming(false)
      notify(err.message ?? 'Could not submit your request. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Document Requests"/>

      <AsyncView loading={types.loading} error={types.error} hasData={types.data != null} skeleton={<DocumentRequestFormSkeleton />}>
      <Card title="New request" description="Pick a document and submit. You will be asked to confirm before it is sent. The fee is paid at the Cashier.">
        <form onSubmit={askConfirmation} noValidate className="grid gap-4 md:grid-cols-2">
          <Select label="Document type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Select a document" options={(types.data ?? []).map((t) => t.name)} error={error} />
          <Input label="Purpose (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Scholarship application" />
          {chosen && (
            <p className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
              Fee {peso(chosen.fee)} · Processing time {chosen.processing}
              {chosen.requiredClearances.length > 0 && ` · Requires clearance from: ${chosen.requiredClearances.join(', ')}`}
            </p>
          )}
          <div className="md:col-span-2"><Button type="submit">Submit request</Button></div>
        </form>
      </Card>

      </AsyncView>

      <AsyncView loading={requests.loading} error={requests.error} hasData={requests.data != null} skeleton={<DocumentRequestsTableSkeleton />}>
        {requests.data && (
          <Card title="My requests" padded={false}>
            <DataTable
              rowKey="ref"
              rows={requests.data}
              searchKeys={['ref', 'type']}
              searchPlaceholder="Search reference or document"
              filter={{ key: 'status', options: DOCUMENT_STATUSES }}
              empty="You have not requested any documents yet."
              columns={[
                { key: 'ref', label: 'Reference no.', sortable: true },
                { key: 'type', label: 'Document' },
                { key: 'date', label: 'Date requested' },
                { key: 'feeStatus', label: 'Fee', render: (r) => <StatusBadge status={r.feeStatus} /> },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              actions={(r) => <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>View</Button>}
            />
          </Card>
        )}
      </AsyncView>

      {/* Confirmation pop-up shown after pressing "Submit request" */}
      <Modal
        open={confirming}
        size="sm"
        title="Confirm document request"
        description="Please review your request before submitting."
        onClose={cancelConfirmation}
        footer={
          <>
            <Button variant="outline" disabled={submitting} onClick={cancelConfirmation}>Cancel</Button>
            <Button loading={submitting} onClick={confirmSubmit}>Confirm</Button>
          </>
        }
      >
        <InfoGrid
          columns="grid-cols-1"
          items={[
            { label: 'Document', value: type },
            { label: 'Purpose', value: purpose.trim() || 'Personal copy' },
            { label: 'Fee', value: chosen ? peso(chosen.fee) : '' },
            { label: 'Processing time', value: chosen?.processing },
          ]}
        />
      </Modal>

      <Modal open={Boolean(selected)} size="lg" title={selected?.type} description={selected?.ref} onClose={() => setSelected(null)} footer={<Button variant="outline" onClick={() => setSelected(null)}>Close</Button>}>
        {selected && <DocumentDetails request={selected} />}
      </Modal>
    </div>
  )
}

