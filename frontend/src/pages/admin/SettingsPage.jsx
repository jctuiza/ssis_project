import AcademicYearPromotion from '../../components/forms/AcademicYearPromotion'
import Select from '../../components/forms/Select'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { useState } from 'react'
import { useToast } from '../../context/toast'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import AsyncView from '../../components/feedback/AsyncView'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import Toggle from '../../components/forms/Toggle'
import useService from '../../hooks/useService'
import * as adminService from '../../services/admin/adminService'


// System settings and fee rates; new fee rates apply only to new assessments.
export default function SettingsPage() {
  const { data, loading, error } = useService(adminService.getSettings, [], "pages/admin/AdminPages.jsx:3")
  const { notify } = useToast()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [values, setValues] = useState(null)
  const waiting = loading && data == null
  const form = values ?? data ?? { systemName: '', currentTerm: '', academicTerms: [], tuitionPerUnit: '', miscFees: '', enrollmentOpen: false, documentRequestsOpen: false, emailNotifications: false, maintenanceMode: false }
  const set = (key) => (value) => {
    setValues({ ...form, [key]: value })
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }
  const save = async () => {
    if (saving || !data) return
    const invalid = {}
    for (const key of ['tuitionPerUnit', 'miscFees']) {
      const raw = form[key]
      if (raw === '' || raw == null || !Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > 1000000) {
        invalid[key] = 'Enter an amount between 0 and 1,000,000.'
      }
    }
    if (Object.keys(invalid).length) { setErrors(invalid); return }
    setSaving(true)
    try {
      const updated = await adminService.saveSettings(form)
      setValues(updated)
      setErrors({})
      notify('Settings saved.')
    } catch (error) {
      if (error.fields) setErrors(error.fields)
      else notify(error.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Settings" description="System-wide options for the student services portal. Closing enrollment or document requests takes effect for students immediately." />
      <>
      {error && <p role="alert" className="text-rose-500">{error.message}</p>}
        {form && (
          <Card>
            <fieldset disabled={waiting || !data} aria-busy={waiting}>
            <div className="grid gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:grid-cols-2">
              <Input label="System name" placeholder={waiting ? 'Loading…' : undefined} error={errors.systemName} value={form.systemName} onChange={(e) => set('systemName')(e.target.value)} />
              <Select label="Select an existing academic term" placeholder="Choose a previous or current term" value={(form.academicTerms ?? []).includes(form.currentTerm) ? form.currentTerm : ''} options={form.academicTerms ?? []} onChange={event => { if (event.target.value) set('currentTerm')(event.target.value) }} />
              <Input label="Current academic term" error={errors.currentTerm} value={form.currentTerm} onChange={(e) => set('currentTerm')(e.target.value)} />
              <Input label="Tuition per unit (₱)" type="number" min="0" max="1000000" step="0.01" value={form.tuitionPerUnit ?? ''} error={errors.tuitionPerUnit} onChange={(e) => set('tuitionPerUnit')(e.target.value)} />
              <Input label="Miscellaneous fees (₱)" type="number" min="0" max="1000000" step="0.01" value={form.miscFees ?? ''} error={errors.miscFees} onChange={(e) => set('miscFees')(e.target.value)} />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              <Toggle label="Enrollment open" description="Students can submit enrollment requests." checked={form.enrollmentOpen} onChange={set('enrollmentOpen')} />
              <Toggle label="Document requests open" description="Students can request documents online." checked={form.documentRequestsOpen} onChange={set('documentRequestsOpen')} />
              <Toggle label="Email notifications" description="Send updates when a request changes status." checked={form.emailNotifications} onChange={set('emailNotifications')} />
              <Toggle label="Maintenance mode" description="Only administrators can log in." checked={form.maintenanceMode} onChange={set('maintenanceMode')} />
            </div>
            <div className="mt-5 flex justify-end">
              <Button loading={saving} onClick={save}>Save settings</Button>
            </div>
            </fieldset>
          </Card>
        )}
      </>
      <AcademicYearPromotion />
    </div>
  )
}


