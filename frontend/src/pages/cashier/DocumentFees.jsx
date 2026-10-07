import { useState } from 'react'
import { Banknote } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Select from '../../components/forms/Select'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import { useToast } from '../../context/toast'
import { PAYMENT_METHODS } from '../../config/constants'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p></div>)
const money = (key) => (row) => peso(row[key])

export default function DocumentFees() {
  const { notify } = useToast()
  const [target, setTarget] = useState(null)
  const [method, setMethod] = useState('Cash')
  const [saving, setSaving] = useState(false)

  const open = (r) => { setTarget(r); setMethod('Cash') }
  const save = async () => {
    setSaving(true)
    try {
      await paymentService.recordDocumentPayment(target.ref, { method })
      notify(`Payment of ${peso(target.fee)} recorded for ${target.ref}.`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
      setTarget(null)
    }
  }

  return (
    <>
      <ResourcePage
        eyebrow="Document Fees"
        title="Document Fees"
        description="Requests approved by the Registrar appear here. Record the fee once the student pays at your window."
        load={paymentService.getDocumentPayments}
        rowKey="ref"
        columns={[
          { key: 'ref', label: 'Reference', sortable: true },
          { key: 'studentName', label: 'Student', sortable: true, render: student },
          { key: 'type', label: 'Document' },
          { key: 'fee', label: 'Amount', sortable: true, render: money('fee') },
          { key: 'feeStatus', label: 'Payment', render: (r) => <StatusBadge status={r.feeStatus} /> },
          { key: 'status', label: 'Request status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        searchKeys={['ref', 'studentId', 'studentName', 'type']}
        searchPlaceholder="Search reference, student or document"
        filter={{ key: 'status', options: ['Pending Payment', 'Payment Recorded', 'Processing', 'Ready for Release', 'Completed'] }}
        empty="No approved requests yet."
        actions={(r) => r.status === 'Pending Payment' && <Button variant="ghost" size="sm" onClick={() => open(r)}><Banknote className="h-3.5 w-3.5" />Record payment</Button>}
      />
      <Modal
        open={Boolean(target)}
        size="sm"
        title="Record document fee"
        description={target ? `${target.type} · ${target.ref}` : ''}
        onClose={() => setTarget(null)}
        footer={<><Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button><Button loading={saving} onClick={save}>Record payment</Button></>}
      >
        {target && (
          <div className="grid gap-4">
            <InfoGrid columns="grid-cols-1" items={[
              { label: 'Student', value: `${target.studentName} (${target.studentId})` },
              { label: 'Program', value: target.program },
              { label: 'Document', value: target.type },
              { label: 'Amount to collect', value: peso(target.fee) },
            ]} />
            <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={PAYMENT_METHODS} />
          </div>
        )}
      </Modal>
    </>
  )
}

// Every payment ever recorded, newest first. The Cashier sees it under "Transactions";
// the Admin sees the same list read-only under "Transactions" (monitor).

