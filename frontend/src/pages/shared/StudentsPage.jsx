import { programsForDepartment } from '../../config/programs'
import { useState } from 'react'
import { Eye, Pencil, UserPlus } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import CredentialsDialog from '../../components/feedback/CredentialsDialog'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { can } from '../../config/permissions'
import { ageFromBirthdate } from '../../utils/format'
import { validateStudent } from '../../utils/validation'
import { ENROLLMENT_STATUSES, YEAR_LEVELS } from '../../config/constants'
import * as studentService from '../../services/student/studentService'
import * as adminService from '../../services/admin/adminService'

const EMPTY = { name: '', email: '', birthdate: '', contact: '', address: '', program: '', yearLevel: '', departmentId: '', emergencyName: '', emergencyContact: '' }

// The order of the fields in the form, used to focus the first invalid one.
const FIELD_ORDER = ['name', 'email', 'contact', 'birthdate', 'address', 'departmentId', 'program', 'yearLevel', 'emergencyName', 'emergencyContact']
const today = () => new Date().toISOString().slice(0, 10)

// Students list for staff. Users with students.manage (the Registrar) can also register and edit students.
export default function StudentsPage({ description }) {
  const { user } = useSession()
  const { notify } = useToast()
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const departmentId = user.departmentId ?? (selectedDepartment || undefined)
  const canManage = can(user, 'students.manage')
  const departments = useService(adminService.getDepartments, [], "pages/shared/StudentsPage.jsx:1")

  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState(null) // { id?: string, values }
  const [errors, setErrors] = useState({}) // { fieldKey: 'message' } shown under each field
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const programOptions = programsForDepartment(departments.data, form?.values.departmentId)
  const validate = (values) => {
    const found = validateStudent(values, { requireDepartment: !user.departmentId })
    const options = programsForDepartment(departments.data, values.departmentId)
    if (values.program && !options.some(option => option.value === values.program)) {
      found.program = 'Select a program offered by the selected department.'
    }
    return found
  }

  const focusFirst = (found) => {
    const first = FIELD_ORDER.find((key) => found[key])
    if (first) document.getElementById(`student-${first}`)?.focus()
  }

  const closeForm = () => {
    setForm(null)
    setErrors({})
  }

  const openCreate = () => {
    setErrors({})
    setForm({ values: { ...EMPTY, departmentId: user.departmentId ?? '' } })
  }
  const openEdit = (s) => {
    setErrors({})
    setForm({
      id: s.id,
      values: { name: s.name, email: s.email, birthdate: s.birthdate ?? '', contact: s.contact ?? '', address: s.address ?? '', program: s.program ?? '', yearLevel: s.yearLevel ?? '', departmentId: s.departmentId ?? '', emergencyName: s.emergencyName ?? '', emergencyContact: s.emergencyContact ?? '' },
    })
  }

  // Updates a value. A field that currently shows an error is re-checked on every change,
  // so its message updates or disappears as soon as the input becomes valid.
  const change = (key) => (e) => {
    const values = { ...form.values, [key]: e.target.value }
    if (key === 'departmentId') {
      values.program = ''
      setErrors(previous => { const next = { ...previous }; delete next.program; return next })
    }
    setForm({ ...form, values })
    if (errors[key]) {
      const issue = validate(values)[key]
      setErrors((prev) => {
        const next = { ...prev }
        if (issue) next[key] = issue
        else delete next[key]
        return next
      })
    }
  }

  // Props shared by every field: id/name, value, change handler and the inline error (red border + message).
  const field = (key) => ({ name: `student-${key}`, value: form.values[key], onChange: change(key), error: errors[key] })

  const save = async () => {
    const found = validate(form.values)
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirst(found)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (form.id) {
        await studentService.updateStudent(form.id, form.values)
        notify('Student information updated.')
      } else {
        const { student, credentials: c } = await studentService.createStudent(form.values)
        setCredentials({ name: student.name, ...c })
      }
      closeForm()
    } catch (err) {
      if (err.fields) {
        // Problems found by the "server" (for example a duplicate email) appear under the matching field too.
        setErrors(err.fields)
        focusFirst(err.fields)
      } else {
        notify(err.message, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'Student ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true, render: (s) => (<div><p className="font-medium text-slate-900 dark:text-white">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div>) },
    { key: 'program', label: 'Program', sortable: true },
    { key: 'yearLevel', label: 'Year level' },
    { key: 'department', label: 'Dept.' },
    { key: 'enrolledOn', label: 'Enrolled On', sortable: true, render: s => s.enrolledOn ? new Date(s.enrolledOn).toLocaleDateString() : 'Not enrolled' },
    { key: 'enrollmentStatus', label: 'Enrollment', render: (s) => <StatusBadge status={s.enrollmentStatus} /> },
  ]

  return (
    <>
      <ResourcePage
        eyebrow="Students"
        title="Students"
        description={description}
        load={() => studentService.getStudents({ departmentId })}
        deps={[departmentId]}
        columns={columns}
        headerContent={!user.departmentId && <Select label="Department" placeholder="All departments" value={selectedDepartment} onChange={e=>setSelectedDepartment(e.target.value)} disabled={departments.loading} options={(departments.data ?? []).map(d=>({value:d.id,label:`${d.code} – ${d.name}`}))} />}
        searchKeys={['id', 'name', 'program']}
        searchPlaceholder="Search Student ID or name"
        filter={{ key: 'enrollmentStatus', options: ENROLLMENT_STATUSES }}
        headerAction={canManage && <Button onClick={openCreate}><UserPlus className="h-4 w-4" />Register student</Button>}
        actions={(s) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => setViewing(s)}><Eye className="h-3.5 w-3.5" />View</Button>
            {canManage && <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
          </>
        )}
      />

      <Modal open={Boolean(viewing)} title={viewing?.name} description="Student information" onClose={() => setViewing(null)} footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <InfoGrid items={[
            { label: 'Student ID', value: viewing.id },
            { label: 'Enrolled On', value: viewing.enrolledOn ? new Date(viewing.enrolledOn).toLocaleString() : 'Not enrolled' },
            { label: 'Email', value: viewing.email },
            { label: 'Birthday', value: viewing.birthday },
            { label: 'Age', value: viewing.age },
            { label: 'Contact', value: viewing.contact },
            { label: 'Address', value: viewing.address },
            { label: 'Program', value: viewing.program },
            { label: 'Year level', value: viewing.yearLevel },
            { label: 'Department', value: viewing.department },
            { label: 'Emergency contact', value: [viewing.emergencyName, viewing.emergencyContact].filter(Boolean).join(' · ') },
            { label: 'Enrollment', value: <StatusBadge status={viewing.enrollmentStatus} /> },
            { label: 'Account', value: <StatusBadge status={viewing.status} /> },
          ]} />
        )}
      </Modal>

      <Modal
        open={Boolean(form)}
        size="lg"
        title={form?.id ? 'Edit student' : 'Register student'}
        description={form?.id ? form.id : 'A student number and a temporary password are generated when you save.'}
        onClose={closeForm}
        footer={<><Button variant="outline" onClick={closeForm}>Cancel</Button><Button loading={saving} onClick={save}>{form?.id ? 'Save changes' : 'Register student'}</Button></>}
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" className="sm:col-span-2" {...field('name')} />
            <Input label="Email address" type="email" {...field('email')} />
            <Input label="Contact number" type="tel" {...field('contact')} />
            <Input label="Birthday" type="date" max={today()} {...field('birthdate')} />
            <Input
              label="Age"
              value={ageFromBirthdate(form.values.birthdate)}
              readOnly
              tabIndex={-1}
              placeholder="Calculated from the birthday"
              className="[&_input]:cursor-not-allowed [&_input]:opacity-70"
            />
            <Textarea label="Address" rows={2} className="sm:col-span-2" {...field('address')} />
            {!user.departmentId && (
              <Select label="Department" className="sm:col-span-2" placeholder={departments.loading ? 'Loading departments…' : 'Select department'} disabled={departments.loading} options={(departments.data ?? []).map((d) => ({ value: d.id, label: `${d.code} – ${d.name}` }))} {...field('departmentId')} />
            )}
            <Select
              label="Program / course"
              options={programOptions}
              placeholder={!form.values.departmentId ? 'Select a department first' : departments.loading ? 'Loading programs…' : programOptions.length ? 'Select program / course' : 'No programs configured for this department'}
              disabled={!form.values.departmentId || departments.loading || !programOptions.length}
              {...field('program')}
            />
            <Select label="Year level" options={YEAR_LEVELS} placeholder="Select year level" {...field('yearLevel')} />
            <Input label="Emergency contact person (optional)" {...field('emergencyName')} />
            <Input label="Emergency contact number (optional)" type="tel" {...field('emergencyContact')} />
          </div>
        )}
      </Modal>

      <CredentialsDialog
        open={Boolean(credentials)}
        title="Student registered"
        description={credentials ? `${credentials.name} can now log in.` : ''}
        fields={credentials ? [{ label: 'Student number', value: credentials.studentNumber }, { label: 'Temporary password', value: credentials.temporaryPassword }] : []}
        onClose={() => setCredentials(null)}
      />
    </>
  )
}


