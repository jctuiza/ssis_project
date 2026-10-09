import { useSession } from '../../context/session'
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

const EMPTY = { code: '', name: '', units: '3', schedule: '', departmentId: '', program: '', yearLevel: '', sharedYearLevels: [], semester: 'First Semester', academicYear: '' }

// The subjects offered each term. When a student enrolls, they are enrolled in the subjects of their college
// (subjects with no department are offered to every college), and Department staff can post grades for each of them.
export default function RegistrarSubjects() {
  const { user } = useSession()
  const { notify } = useToast()
  const filters = useAcademicFilters()
  const settings = useService(adminService.getSettings, [], 'subjects:settings')
  const currentSemester = /2nd|Second/i.test(settings.data?.currentTerm ?? '') ? 'Second Semester' : 'First Semester'
  const currentYear = settings.data?.currentTerm?.match(/(\d{4})\D{1,3}(\d{4})/)?.slice(1).join('-') ?? ''
  const [semesterFilter, setSemesterFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const activeSemester = semesterFilter || currentSemester
  const activeYear = yearFilter || currentYear
  const departments = useService(adminService.getDepartments, [], 'subjects:departments')
  const [form, setForm] = useState(null) // null = closed; { editing: code | null, values }
  const [errors, setErrors] = useState({})
  const [removing, setRemoving] = useState(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => { setErrors({}); setForm({ editing: null, values: {...EMPTY, departmentId: String(user.departmentId), program: filters.program, semester: activeSemester, academicYear: activeYear} }) }
  const openEdit = (s) => {
    setErrors({})
    setForm({ editing: s.code, values: { code: s.code, name: s.name, units: String(s.units), schedule: s.schedule ?? '', departmentId: s.departmentId ?? '', program: s.program ?? '', yearLevel: String(s.yearLevel ?? ''), sharedYearLevels: s.sharedYearLevels ?? [], semester: s.semester ?? currentSemester, academicYear: s.academicYear ?? '' } })
  }
  const close = () => { if (!saving) setForm(null) }
  const field = (key) => ({
    value: form.values[key],
    error: errors[key],
    onChange: (e) => {
      if (saving) return
      setForm({ ...form, values: { ...form.values, [key]: e.target.value, ...(key === 'program' ? { yearLevel: '', sharedYearLevels: [] } : key === 'yearLevel' ? { sharedYearLevels: form.values.sharedYearLevels.filter(y=>String(y)!==e.target.value) } : {}) } })
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
      {settings.error && <p role="alert" className="text-sm text-rose-500">{settings.error.message} <button type="button" className="underline" onClick={settings.reload}>Retry</button></p>}
      <ResourcePage
        eyebrow="Subjects"
        title="Subjects"
        description="The subjects offered each term. Assignments match the student’s program, year level, semester and academic year. Current-term assignments refresh automatically; historical records are preserved."
        load={() => filters.ready && activeYear ? subjectService.getSubjects({ department_id: filters.departmentId, program: filters.program, year_level: filters.yearLevel, semester: activeSemester, academic_year: activeYear }) : Promise.resolve([])}
        deps={[filters.departmentId, filters.program, filters.yearLevel, activeSemester, activeYear]}
        headerContent={<AcademicFilters filters={filters}><Select label="Year Level" placeholder="All assigned years" value={filters.yearLevel} options={filters.yearOptions} onChange={e=>filters.setYearLevel(e.target.value)} /><Select label="Semester" value={activeSemester} options={['First Semester','Second Semester']} onChange={e=>setSemesterFilter(e.target.value)} /><Input label="Academic year" placeholder="2026-2027" value={activeYear} onChange={e=>setYearFilter(e.target.value)} /></AcademicFilters>}
        empty={filters.ready ? 'No subjects are offered to this program.' : 'Select a program to view subjects.'}
        rowKey="code"
        columns={[...SUBJECT_COLUMNS.filter(c=>c.key !== 'department'), {key:'yearLevel',label:'Year Level',render:s=>s.yearLevel ? `${s.yearLevel}${s.sharedYearLevels?.length ? ' (shared: '+s.sharedYearLevels.join(', ')+')' : ''}` : 'Unassigned'}, {key:'semester',label:'Semester'}, {key:'academicYear',label:'Academic year',render:s=>s.academicYear ?? 'All academic years'}]}
        searchKeys={['code', 'name', 'department']}
        searchPlaceholder="Search code, subject or college"
        headerAction={<Button disabled={saving || settings.loading || departments.loading || Boolean(settings.error || departments.error)} onClick={openNew}><BookPlus className="h-4 w-4" />Add subject</Button>}
        actions={(s) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={saving || String(s.departmentId) !== String(user.departmentId)} onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <Button variant="ghost" size="sm" className="!text-rose-500" disabled={saving || s.enrolled > 0 || String(s.departmentId) !== String(user.departmentId)} onClick={() => setRemoving(s)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
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
            <Select label="Course / Program" placeholder="Select program" disabled={!form.values.departmentId || saving} options={programsForDepartment(departments.data, form.values.departmentId)} {...field('program')} />
            <Select label="Year Level" placeholder="Select year level" options={Array.from({length: 5},(_,i)=>({value:String(i+1),label:['First Year','Second Year','Third Year','Fourth Year','Fifth Year'][i]}))} {...field('yearLevel')} />
            <Select label="Semester" options={['First Semester','Second Semester']} {...field('semester')} />
            <Input label="Academic year" placeholder="2026-2027" {...field('academicYear')} /><p className="text-xs text-slate-500 sm:col-span-2">Leave academic year empty to offer this subject every academic year.</p>
            <div className="sm:col-span-2"><p className="text-sm text-slate-500">Shared year levels (only when explicitly assigned)</p><div className="mt-2 flex flex-wrap gap-3">{Array.from({length: 5},(_,i)=>i+1).filter(y=>String(y)!==form.values.yearLevel).map(y=><label key={y} className="text-sm"><input type="checkbox" disabled={saving} checked={form.values.sharedYearLevels.includes(y)} onChange={e=>setForm({...form,values:{...form.values,sharedYearLevels:e.target.checked ? [...form.values.sharedYearLevels,y] : form.values.sharedYearLevels.filter(v=>v!==y)}})} /> Year {y}</label>)}</div></div>
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
