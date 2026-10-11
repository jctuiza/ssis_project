import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Select from './Select'
import { Textarea } from './Input'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import * as requests from '../../services/shared/enrollmentRequestService'

export default function ExistingEnrollmentRequest({ enrollment, enrollmentOpen, onUpdate, eligibleTypes = [] }) {
  const { notify } = useToast()
  const { data, loading, error, reload } = useService(requests.getAll, [], 'student:enrollment-requests')
  const [type, setType] = useState('Irregular')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const current = data?.find(row => row.currentTerm)
  const locked = current && !['Returned', 'Rejected'].includes(current.status)
  const send = async event => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await requests.submit({ type: eligibleTypes.includes(type) ? type : eligibleTypes[0], notes })
      notify('Enrollment request sent for Department and Registrar review.')
      setNotes('')
      await reload()
      await onUpdate?.()
    } catch (err) { notify(err.message, 'error') } finally { setSaving(false) }
  }
  if (!eligibleTypes.length && !current && !data?.length) return null
  return <Card title="Irregular / returning enrollment" description="Use your existing Student ID. Your Department recommends subjects and the Registrar approves them. Complete clearance, then confirm enrollment yourself.">
    {error && <p role="alert" className="mb-3 text-sm text-rose-500">{error.message} <button onClick={reload} className="underline">Retry</button></p>}
    {current && <div className="mb-4 space-y-2 text-sm">
      <p><strong>{current.type} request:</strong> {current.status} · {current.term}</p>
      <p>Your reason: {current.notes}</p>
      {current.subjectCodes.length > 0 && <p>Recommended subjects: {current.subjectCodes.join(', ')}</p>}
      {current.recommendation && <p>Department remarks: {current.recommendation}</p>}
      {current.reviewNotes && <p>Registrar remarks: {current.reviewNotes}</p>}
      {current.status === 'Approved' && <p>Subjects are approved. Pay the assessment and complete all required clearances, then use Enroll below to confirm.</p>}
      {current.status === 'Confirmed' && <p>Enrollment is complete. Your academic records and previous attempts are retained.</p>}
    </div>}
    {!locked && eligibleTypes.length > 0 && enrollment?.status !== 'Enrolled' && <form onSubmit={send} className="space-y-4">
      <Select label="Request type" value={eligibleTypes.includes(type) ? type : eligibleTypes[0] ?? ''} options={eligibleTypes} disabled={saving} onChange={e => setType(e.target.value)} />
      <Textarea label="Reason / academic concerns" value={notes} required maxLength={2000} disabled={saving} onChange={e => setNotes(e.target.value)} placeholder="Explain failed or incomplete subjects, or when you last attended school." />
      <p className="text-xs text-slate-500">Submitting switches this term to reviewed subject assignment. Regular self-enrollment will be unavailable while this request is being processed. Complete non-Cashier clearances before Registrar confirmation.</p>
      <Button type="submit" loading={saving} disabled={loading || Boolean(error) || !enrollmentOpen}>{current ? 'Resubmit request' : 'Submit enrollment request'}</Button>
    </form>}
    {!enrollmentOpen && <p className="mt-3 text-sm text-slate-500">Enrollment is currently closed.</p>}
    {data?.some(row => !row.currentTerm) && <details className="mt-4 text-sm"><summary className="cursor-pointer">Previous requests</summary>{data.filter(row => !row.currentTerm).map(row => <p className="mt-2" key={row.id}>{row.term} · {row.type} · {row.status}{row.reviewNotes ? ` — ${row.reviewNotes}` : ''}</p>)}</details>}
  </Card>
}
