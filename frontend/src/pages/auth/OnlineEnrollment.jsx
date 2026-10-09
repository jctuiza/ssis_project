import { useState } from 'react'
import { Link } from 'react-router-dom'
import campus from '../../assets/campus.webp'
import Card from '../../components/ui/Card'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/loading/Skeleton'
import useService from '../../hooks/useService'
import * as admissions from '../../services/shared/admissionService'

const EMPTY = { firstName: '', lastName: '', middleName: '', gender: '', birthdate: '', departmentId: '', program: '', contact: '', email: '' }
export default function OnlineEnrollment() {
  const options = useService(admissions.getOptions, [], 'admissions:options')
  const [form, setForm] = useState(EMPTY)
  const [receipt, setReceipt] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const department = options.data?.departments.find(d => String(d.id) === String(form.departmentId))
  const field = key => ({ value: form[key], error: errors[key], onChange: e => setForm(previous => ({ ...previous, [key]: e.target.value, ...(key === 'departmentId' ? { program: '' } : {}) })) })
  const run = async (action) => {
    if (busy) return
    setBusy(true); setMessage(''); setErrors({})
    try { await action() } catch (error) { setMessage(error.message); setErrors(error.fields ?? {}) } finally { setBusy(false) }
  }
  const submit = e => { e.preventDefault(); run(async () => {
    const result = await admissions.apply(form)
    setReceipt(result); setForm(EMPTY)
  }) }
  return <main className="relative isolate min-h-screen px-4 py-10 text-slate-800 dark:text-slate-200">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${campus})` }} />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-slate-100/85 dark:bg-slate-950/85" />
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-semibold">First-year online enrollment</h1><p className="mt-2 text-sm text-slate-500">Submit your application for Registrar review. <Link className="text-violet-600 underline" to="/student/login">Student login</Link></p></div>
      {message && <p role="alert" className="rounded-xl bg-rose-500/10 p-4 text-rose-600">{message}</p>}
      <Card title="Enrollment application" description="The application date is recorded automatically on submission.">
        {options.error && <p role="alert">Enrollment options could not be loaded. <button className="underline" onClick={options.reload}>Retry</button></p>}
        {options.loading ? <Skeleton className="mb-4 h-5 w-48" /> : <p className="mb-4 text-sm">Academic term: {options.data?.term}</p>}
        {options.data && !options.data.open && <p className="mb-4 text-amber-600">Applications are currently closed.</p>}
        {!receipt && <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Last name" required {...field('lastName')} /><Input label="First name" required {...field('firstName')} />
          <Input label="Middle name (optional)" {...field('middleName')} />
          <Select label="Gender" required placeholder="Select gender" options={['Male','Female','Other','Prefer not to say']} {...field('gender')} />
          <Input label="Date of birth" type="date" required max={new Date().toISOString().slice(0,10)} {...field('birthdate')} />
          <Input label="Contact number" type="tel" required placeholder="09123456789" {...field('contact')} />
          <Input label="Email address" type="email" required {...field('email')} />
          <Select label="Department" required disabled={!options.data} placeholder="Select department" options={(options.data?.departments ?? []).map(d => ({ value: d.id, label: `${d.code} – ${d.name}` }))} {...field('departmentId')} />
          <Select label="Course to enroll" required disabled={!department} placeholder="Select course / program" options={department?.programs ?? []} {...field('program')} />
          <div className="sm:col-span-2"><Button type="submit" loading={busy} disabled={!options.data?.open}>Submit application</Button></div>
        </form>}
        {receipt && <div className="space-y-3"><p role="status">Application submitted successfully. Please save your application reference.</p><p className="break-all">Application reference: <strong>{receipt.application.reference}</strong></p><p className="text-sm text-slate-500">Contact the Registrar and provide this reference for assistance with your application.</p></div>}
      </Card>
    </div>
  </main>
}
