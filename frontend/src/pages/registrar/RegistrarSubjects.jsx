import AcademicFilters from '../../components/forms/AcademicFilters'
import useAcademicFilters from '../../hooks/useAcademicFilters'
import { programsForDepartment } from '../../config/programs'
import { SUBJECT_COLUMNS } from '../../config/subjectColumns'
import { useState } from 'react'
import { BookPlus, Pencil, Trash2 } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import * as subjectService from '../../services/registrar/subjectService'
import * as adminService from '../../services/admin/adminService'

const EMPTY = { code: '', name: '', units: '3', schedule: '', departmentId: '', program: '' }

// The subjects offered each term. When a student enrolls, they are enrolled in the subjects of their college
// (subjects with no department are offered to every college), and the Registrar can post grades for each of them.
export default function RegistrarSubjects() {
  const { notify } = useToast()
  const filters = useAcademicFilters()
  const departments = useService(adminService.getDepartments, [], 'subjects:departments')
  const [form, setForm] = useState(null) // null = closed; { editing: code | null, values }
  const [errors, setErrors] = useState({})
  const [removing, setRemoving] = useState(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => { setErrors({}); setForm({ editing: null, values: EMPTY }) }
  const openEdit = (s) => {
    setErrors({})
    setForm({ editing: s.code, values: { code: s.code, name: s.name, units: String(s.units), schedule: s.schedule ?? '', departmentId: s.departmentId ?? '', program: s.program ?? '' } })
  }
  const close = () => { if (!saving) setForm(null) }
  const field = (key) => ({
    value: form.values[key],
    error: errors[key],
    onChange: (e) => {
      if (saving) return
      setForm({ ...form, values: { ...form.values, [key]: e.target.value, ...(key === 'departmentId' ? { program: '' } : {}) } })
      if (errors[key]) setErrors({ ...errors, [key]: undefined })
    },
  })

  const save = async () => {
    if (!form || saving) return
    setSaving(true)
    try {
      if (form.editing) await subjectService.updateSubject(form.editing, form.values)
      else await subjectService.createSubject(form.values)
      notify(form.editing ? `${form.editing} updated.` : `Subject ${form.values.code.toUpperCase()} added.`)
      setForm(null)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removing || saving) return
    setSaving(true)
    try {
      await subjectService.deleteSubject(removing.code)
      notify(`${removing.code} deleted.`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
      setRemoving(null)
    }
  }

  return (
    <>
      <ResourcePage
        eyebrow="Subjects"
        title="Subjects"
        description="The subjects offered each term. Students are enrolled in the subjects of their college, and grades are posted per subject. Changes apply to students who enroll from now on."
        load={() => filters.ready ? subjectService.getSubjects({ department_id: filters.departmentId, program: filters.program }) : Promise.resolve([])}
        deps={[filters.departmentId, filters.program]}
        headerContent={<AcademicFilters filters={filters} />}
        empty={filters.ready ? 'No subjects are offered to this program.' : 'Select a department and program to view subjects.'}
        rowKey="code"
        columns={SUBJECT_COLUMNS}
        searchKeys={['code', 'name', 'department']}
        searchPlaceholder="Search code, subject or college"
        headerAction={<Button disabled={saving} onClick={openNew}><BookPlus className="h-4 w-4" />Add subject</Button>}
        actions={(s) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <Button variant="ghost" size="sm" className="!text-rose-500" disabled={saving || s.enrolled > 0} onClick={() => setRemoving(s)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
          </div>
        )}
      />
      <Modal
        open={Boolean(form)}
        title={form?.editing ? `Edit ${form.editing}` : 'Add subject'}
        onClose={close}
        footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button loading={saving} onClick={save}>{form?.editing ? 'Save changes' : 'Add subject'}</Button></>}
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Subject code" placeholder="IT101" disabled={Boolean(form.editing)} {...field('code')} />
            <Input label="Units" type="number" min="1" max="9" step="1" {...field('units')} />
            <Input label="Subject name" className="sm:col-span-2" placeholder="Introduction to Computing" {...field('name')} />
            <Input label="Schedule (optional)" placeholder="MWF 9:00-10:00 AM" {...field('schedule')} />
            <Select
              label="Offered to"
              disabled={departments.loading || saving}
              placeholder="All colleges"
              options={(departments.data ?? []).map((d) => ({ value: d.id, label: `${d.code} – ${d.name}` }))}
              {...field('departmentId')}
            />
            <Select label="Course / Program" placeholder="All programs in this department" disabled={!form.values.departmentId || saving} options={programsForDepartment(departments.data, form.values.departmentId)} {...field('program')} />
            {departments.error && <p role="alert" className="text-sm text-rose-500 sm:col-span-2">Departments could not be loaded. <button type="button" className="underline" onClick={departments.reload}>Retry</button></p>}
          </div>
        )}
      </Modal>
      <ConfirmationDialog
        open={Boolean(removing)}
        title="Delete subject"
        message={removing ? `Delete ${removing.code} – ${removing.name}? This is only possible while no student is enrolled in it.` : ''}
        confirmLabel="Delete"
        danger
        loading={saving}
        onConfirm={remove}
        onCancel={() => { if (!saving) setRemoving(null) }}
      />
    </>
  )
}
