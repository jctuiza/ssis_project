import { GRADE_COLUMNS } from '../../config/gradeColumns'
import AcademicFilters from '../../components/forms/AcademicFilters'
import Select from '../../components/forms/Select'
import useAcademicFilters from '../../hooks/useAcademicFilters'
import * as adminService from '../../services/admin/adminService'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import AsyncView from '../../components/feedback/AsyncView'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import { SEMESTERS } from '../../config/constants'
import * as gradeService from '../../services/shared/gradeService'


// Grades are percentages per period. The student's Grades page and the Records/GWA page read the same rows.
export default function RegistrarGrades() {
  const { notify } = useToast()
  const filters = useAcademicFilters()
  const settings = useService(adminService.getSettings, [], 'academic:settings')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const defaultYear = settings.data?.currentTerm?.match(/(\d{4})\D{1,3}(\d{4})/)?.slice(1).join('-') ?? ''
  const selectedYear = year || defaultYear
  const selectedSemester = semester || (/2nd|Second/i.test(settings.data?.currentTerm ?? '') ? 'Second Semester' : 'First Semester')
  const { data, loading, error } = useService(() => filters.ready && selectedYear ? gradeService.getAll({ department_id: filters.departmentId, program: filters.program, academic_year: selectedYear, semester: selectedSemester }) : Promise.resolve([]), [filters.departmentId, filters.program, selectedYear, selectedSemester], 'registrar:filtered-grades')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ prelim: '', midterm: '', finals: '' })
  const [saving, setSaving] = useState(false)

  const open = (g) => { setSelected(g); setForm({ prelim: g.prelim ?? '', midterm: g.midterm ?? '', finals: g.finals ?? '' }) }
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const save = async () => {
    setSaving(true)
    try {
      await gradeService.updateGrade(selected.id, form)
      notify(`Grades for ${selected.studentName} updated.`)
      setSelected(null)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Grades" title="Grades" description="Encode and correct prelim, midterm and finals grades (0–100). Students see changes right away." />
      <AcademicFilters filters={filters} />
      <Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Select label="Academic year" value={selectedYear} placeholder="Select academic year" options={[...new Set([defaultYear, ...(settings.data?.academicTerms ?? []).map(term => term.match(/(\d{4})\D{1,3}(\d{4})/)?.slice(1).join('-'))].filter(Boolean))]} onChange={event => setYear(event.target.value)} />
        <Select label="Semester" value={selectedSemester} options={SEMESTERS} onChange={event => setSemester(event.target.value)} />
      </div></Card>
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<Card padded={false}><DataTable columns={GRADE_COLUMNS} loading searchKeys={['studentId', 'studentName']} actions={() => null} /></Card>}>
        {data && (
          <Card padded={false}>
            <DataTable
              columns={GRADE_COLUMNS}
              rows={data}
              empty={filters.ready ? "No enrolled students match these filters." : "Select a department and program to view grade records."}
              searchKeys={['studentId', 'studentName', 'code', 'subject']}
              searchPlaceholder="Search student, course code or subject"
             
              actions={(g) => <Button variant="ghost" size="sm" onClick={() => open(g)}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
            />
          </Card>
        )}
      </AsyncView>
      <Modal
        open={Boolean(selected)}
        size="sm"
        title="Edit grades"
        description={selected ? `${selected.studentName} · ${selected.code} ${selected.subject}` : ''}
        onClose={() => setSelected(null)}
        footer={<><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save grades</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Prelim" type="number" step="0.01" min="0" max="100" value={form.prelim} onChange={set('prelim')} />
          <Input label="Midterm" type="number" step="0.01" min="0" max="100" value={form.midterm} onChange={set('midterm')} />
          <Input label="Finals" type="number" step="0.01" min="0" max="100" value={form.finals} onChange={set('finals')} />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Leave a period empty if it is not posted yet. The final grade is the average of the three periods.</p>
      </Modal>
    </div>
  )
}

