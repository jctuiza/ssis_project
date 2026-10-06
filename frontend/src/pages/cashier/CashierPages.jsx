import { useState } from 'react'
import { Banknote } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import InfoGrid from '../../components/common/InfoGrid'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../context/toast'
import { PAYMENT_METHODS, PAYMENT_STATUSES, TRANSACTION_STATUSES } from '../../config/constants'
import { peso } from '../../utils/format'
import * as paymentService from '../../services/paymentService'

const student = (a) => (<div><p className="font-medium text-slate-900 dark:text-white">{a.studentName}</p><p className="text-xs text-slate-400">{a.studentId}</p></div>)
const money = (key) => (row) => peso(row[key])

export function StudentAccounts() {
  return (
    <ResourcePage
      eyebrow="Student Accounts"
      title="Student Accounts"
      description="Balance and payment status for every student."
      load={paymentService.getAssessments}
      columns={[
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'program', label: 'Program' },
        { key: 'total', label: 'Assessed', sortable: true, render: money('total') },
        { key: 'paid', label: 'Paid', sortable: true, render: money('paid') },
        { key: 'balance', label: 'Balance', sortable: true, render: money('balance') },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
      ]}
      searchKeys={['studentId', 'studentName', 'program']}
      searchPlaceholder="Search Student ID or name"
      filter={{ key: 'status', options: PAYMENT_STATUSES }}
    />
  )
}

export function Assessments() {
  return (
    <ResourcePage
      eyebrow="Assessments"
      title="Assessments"
      description="Tuition and fee assessment for the current term."
      load={paymentService.getAssessments}
      columns={[
        { key: 'code', label: 'Assessment', sortable: true },
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'term', label: 'Term' },
        { key: 'tuition', label: 'Tuition', render: money('tuition') },
        { key: 'misc', label: 'Misc. fees', render: money('misc') },
        { key: 'total', label: 'Total', sortable: true, render: money('total') },
      ]}
      searchKeys={['code', 'studentId', 'studentName']}
      searchPlaceholder="Search Student ID or name"
    />
  )
}

// Record a full or partial (installment) tuition payment received face-to-face.
// The balance, status, clearance, payment history and the student's notifications update everywhere.
export function Payments() {
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
              Remaining balance after this payment: <span className="font-semibold">{peso(remaining)}</span> ({remaining === 0 ? 'Fully Paid' : 'Partially Paid'})
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}

// Document requests the Registrar approved. The student pays in person; the Cashier records it here.
// Recording the payment moves the request to Payment Recorded (or Ready for Release) and notifies the student and the Registrar.
export function DocumentFees() {
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
export function Transactions({ readOnly = false }) {
  return (
    <ResourcePage
      eyebrow="Transactions"
      title="Transactions"
      description={readOnly ? 'Read-only view of every payment recorded by the Cashier.' : 'Every recorded payment, newest first: tuition payments and document fees.'}
      load={paymentService.getTransactions}
      columns={[
        { key: 'reference', label: 'Transaction', sortable: true },
        { key: 'studentName', label: 'Student', sortable: true, render: student },
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description' },
        { key: 'method', label: 'Method' },
        { key: 'amount', label: 'Amount', sortable: true, render: money('amount') },
        { key: 'balanceAfter', label: 'Balance after', render: (t) => (t.balanceAfter == null ? '—' : peso(t.balanceAfter)) },
        { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      ]}
      searchKeys={['reference', 'studentId', 'studentName', 'description']}
      searchPlaceholder="Search transaction or student"
      filter={{ key: 'status', options: TRANSACTION_STATUSES }}
    />
  )
}