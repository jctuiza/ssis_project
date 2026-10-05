import { useState } from 'react'
import { Pencil } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import AsyncView from '../../components/common/AsyncView'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import { SEMESTERS } from '../../config/constants'
import * as gradeService from '../../services/gradeService'

const show = (v) => (v == null ? '--' : v.toFixed(2))

// Grades are percentages per period. The student's Grades page and the Records/GWA page read the same rows.
export default function RegistrarGrades() {
  const { notify } = useToast()
  const { data, loading, error } = useService(gradeService.getAll)
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
      <AsyncView loading={loading} error={error}>
        {data && (
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'studentId', label: 'Student ID', sortable: true },
                { key: 'studentName', label: 'Name', sortable: true },
                { key: 'code', label: 'Course code', sortable: true },
                { key: 'subject', label: 'Subject' },
                { key: 'term', label: 'Term' },
                { key: 'prelim', label: 'Prelim', render: (g) => show(g.prelim) },
                { key: 'midterm', label: 'Midterm', render: (g) => show(g.midterm) },
                { key: 'finals', label: 'Finals', render: (g) => show(g.finals) },
                { key: 'finalGrade', label: 'Final', sortable: true, render: (g) => (g.finalGrade == null ? '--' : `${g.finalGrade.toFixed(2)} (${g.gradePoint.toFixed(2)})`) },
              ]}
              rows={data}
              searchKeys={['studentId', 'studentName', 'code', 'subject']}
              searchPlaceholder="Search student, course code or subject"
              filter={{ key: 'semester', options: SEMESTERS }}
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
