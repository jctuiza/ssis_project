import { useState } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import AsyncView from '../../components/common/AsyncView'
import Button from '../../components/common/Button'
import Input, { Textarea } from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Toggle from '../../components/common/Toggle'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import { permissionLabel } from '../../config/permissions'
import * as adminService from '../../services/adminService'

// Runs an async admin action with a spinner flag and an error toast.
function useAction() {
  const { notify } = useToast()
  const [saving, setSaving] = useState(false)
  const run = async (task, message) => {
    setSaving(true)
    try {
      const result = await task()
      if (message) notify(message)
      return { ok: true, result }
    } catch (err) {
      notify(err.message, 'error')
      return { ok: false }
    } finally {
      setSaving(false)
    }
  }
  return { saving, run }
}

// The roles are predefined by the system. This page only shows them and what each role can do.
export function Roles() {
  const { data, loading, error } = useService(adminService.getRoles)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roles"
        title="Roles"
        description="Roles are predefined by the system. Every account has one role, and the role decides which modules a user can open."
      />
      <AsyncView loading={loading} error={error}>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((r) => (
            <Card
              key={r.key}
              title={r.label}
              description={r.description}
              action={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{r.users} {r.users === 1 ? 'user' : 'users'}</span>}
            >
              <p className="mb-2 text-xs text-slate-400">
                Predefined role · key <code className="text-slate-600 dark:text-slate-300">{r.key}</code>
              </p>
              {r.key === 'student'
                ? <p className="text-xs text-slate-500 dark:text-slate-400">Students use the Student Portal and can only see their own information.</p>
                : <ul className="flex flex-wrap gap-2">{r.permissions.map((p) => <li key={p} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{permissionLabel(p)}</li>)}</ul>}
            </Card>
          ))}
        </section>
      </AsyncView>
    </div>
  )
}

export function Departments() {
  return (
    <ResourcePage
      eyebrow="Departments"
      title="Departments"
      description="Colleges and the people assigned to them."
      load={adminService.getDepartments}
      columns={[
        { key: 'code', label: 'Code', sortable: true },
        { key: 'name', label: 'Department', sortable: true },
        { key: 'head', label: 'Head' },
        { key: 'students', label: 'Students', sortable: true },
        { key: 'staff', label: 'Staff' },
      ]}
      searchKeys={['code', 'name', 'head']}
    />
  )
}

export function ActivityLogs() {
  const roles = useService(adminService.getRoles)
  return (
    <ResourcePage
      eyebrow="Activity Logs"
      title="Activity Logs"
      description="A record of important actions across the system, including payments and password resets."
      load={adminService.getLogs}
      columns={[
        { key: 'time', label: 'When' },
        { key: 'actor', label: 'User', sortable: true },
        { key: 'roleLabel', label: 'Role' },
        { key: 'action', label: 'Action' },
      ]}
      searchKeys={['actor', 'action']}
      searchPlaceholder="Search user or action"
      filter={{ key: 'roleLabel', options: (roles.data ?? []).map((r) => r.label) }}
    />
  )
}

export function SettingsPage() {
  const { data, loading, error } = useService(adminService.getSettings)
  const { saving, run } = useAction()
  const [values, setValues] = useState(null)
  const form = values ?? data
  const set = (key) => (value) => setValues({ ...form, [key]: value })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Settings" title="Settings" description="System-wide options for the student services portal. Closing enrollment or document requests takes effect for students immediately." />
      <AsyncView loading={loading} error={error}>
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
export function Announcements() {
  const { saving, run } = useAction()
  const [form, setForm] = useState(null)
  const [removing, setRemoving] = useState(null)

  return (
    <>
      <ResourcePage
        eyebrow="Announcements"
        title="Announcements"
        description="Post news for students. Each announcement appears on the student homepage and in their notifications."
        load={adminService.getAnnouncements}
        columns={[
          { key: 'title', label: 'Title', sortable: true },
          { key: 'body', label: 'Message' },
          { key: 'date', label: 'Posted' },
          { key: 'author', label: 'Posted by' },
        ]}
        searchKeys={['title', 'body']}
        searchPlaceholder="Search announcements"
        headerAction={<Button onClick={() => setForm({ title: '', body: '' })}><Megaphone className="h-4 w-4" />New announcement</Button>}
        actions={(a) => <Button variant="ghost" size="sm" className="!text-rose-500" onClick={() => setRemoving(a)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>}
      />
      <Modal
        open={Boolean(form)}
        title="New announcement"
        onClose={() => setForm(null)}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button loading={saving} onClick={async () => { const { ok } = await run(() => adminService.createAnnouncement(form), 'Announcement published.'); if (ok) setForm(null) }}>Publish</Button></>}
      >
        {form && (
          <div className="grid gap-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea label="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
        )}
      </Modal>
      <ConfirmationDialog
        open={Boolean(removing)}
        title="Delete announcement"
        message={removing ? `Delete "${removing.title}"? Students will no longer see it.` : ''}
        confirmLabel="Delete"
        danger
        loading={saving}
        onConfirm={async () => { await run(() => adminService.deleteAnnouncement(removing.id), 'Announcement deleted.'); setRemoving(null) }}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}