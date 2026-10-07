import { useState } from 'react'
import { Banknote } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import { useToast } from '../../context/toast'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../config/constants'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/cashier/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p>{a.tuitionPending && <p className="text-xs text-amber-600 dark:text-amber-400">Tuition awaiting subjects</p>}</div>)
const money = (key) => (row) => peso(row[key])

export default function Payments() {
  const { notify } = useToast()
  const [target, setTarget] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [saving, setSaving] = useState(false)

  const open = (a) => { setTarget(a); setAmount(String(a.balance)); setMethod('Cash') }
  const value = Number(amount)
  const remaining = target && Number.isFinite(value) ? Math.max(0, target.balance - value) : null

  const save = async () => {
    setSaving(true)
    try {
      await paymentService.recordPayment(target.id, { amount, method })
      notify(`Payment of ${peso(value)} recorded for ${target.studentName}.`)
      setTarget(null)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ResourcePage
        eyebrow="Payments"
        title="Payments"
        description="Record full or partial payments received at the Cashier's Office. The balance and the student's portal update automatically. This prototype records payments only and does not process real money."
        load={paymentService.getAssessments}
        columns={[
          { key: 'studentName', label: 'Student', sortable: true, render: student },
          { key: 'total', label: 'Assessed', render: money('total') },
          { key: 'paid', label: 'Paid', render: money('paid') },
          { key: 'balance', label: 'Balance', sortable: true, render: money('balance') },
          { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
        ]}
        searchKeys={['studentId', 'studentName']}
        searchPlaceholder="Search Student ID or name"
        filter={{ key: 'status', options: PAYMENT_STATUSES }}
        actions={(a) => a.balance > 0 && <Button variant="ghost" size="sm" onClick={() => open(a)}><Banknote className="h-3.5 w-3.5" />Record payment</Button>}
      />
      <Modal
        open={Boolean(target)}
        size="sm"
        title="Record payment"
        description={target ? `${target.studentName} · balance ${peso(target.balance)}` : ''}
        onClose={() => setTarget(null)}
        footer={<><Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button><Button loading={saving} onClick={save}>Record payment</Button></>}
      >
        <div className="grid gap-4">
          <Input label="Amount received" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {target && <div><Button variant="ghost" size="sm" onClick={() => setAmount(String(target.balance))}>Pay the full balance ({peso(target.balance)})</Button></div>}
          <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={PAYMENT_METHODS} />
          {remaining !== null && (
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-slate-700 dark:bg-violet-500/10 dark:text-slate-200">
              Remaining balance after this payment: <span className="font-semibold">{peso(remaining)}</span> ({target?.tuitionPending ? 'Tuition awaiting subjects' : remaining === 0 ? 'Fully Paid' : 'Partially Paid'})
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}

// Document requests the Registrar approved. The student pays in person; the Cashier records it here.
// Recording the payment moves the request to Payment Recorded (or Ready for Release) and notifies the student and the Registrar.

