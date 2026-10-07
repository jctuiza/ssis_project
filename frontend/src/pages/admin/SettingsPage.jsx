import useAction from '../../hooks/useAction'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import AsyncView from '../../components/feedback/AsyncView'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import Toggle from '../../components/forms/Toggle'
import useService from '../../hooks/useService'
import * as adminService from '../../services/admin/adminService'


// The roles are predefined by the system. This page only shows them and what each role can do.
export default function SettingsPage() {
  const { data, loading, error } = useService(adminService.getSettings, [], "pages/admin/AdminPages.jsx:3")
  const { saving, run } = useAction()
  const [values, setValues] = useState(null)
  const form = values ?? data
  const set = (key) => (value) => setValues({ ...form, [key]: value })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Settings" description="System-wide options for the student services portal. Closing enrollment or document requests takes effect for students immediately." />
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<ScreenSkeleton kind="settings" />}>
        {form && (
          <Card>
            <div className="grid gap-4 border-b border-slate-100 pb-5 dark:border-white/10 sm:grid-cols-2">
              <Input label="System name" value={form.systemName} onChange={(e) => set('systemName')(e.target.value)} />
              <Input label="Current academic term" value={form.currentTerm} onChange={(e) => set('currentTerm')(e.target.value)} />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              <Toggle label="Enrollment open" description="Students can submit enrollment requests." checked={form.enrollmentOpen} onChange={set('enrollmentOpen')} />
              <Toggle label="Document requests open" description="Students can request documents online." checked={form.documentRequestsOpen} onChange={set('documentRequestsOpen')} />
              <Toggle label="Email notifications" description="Send updates when a request changes status." checked={form.emailNotifications} onChange={set('emailNotifications')} />
              <Toggle label="Maintenance mode" description="Only administrators can log in." checked={form.maintenanceMode} onChange={set('maintenanceMode')} />
            </div>
            <div className="mt-5 flex justify-end">
              <Button loading={saving} onClick={() => run(() => adminService.saveSettings(form), 'Settings saved.')}>Save settings</Button>
            </div>
          </Card>
        )}
      </AsyncView>
    </div>
  )
}

// Published announcements show on every student's homepage and notify all students.

