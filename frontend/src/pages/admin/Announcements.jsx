import useAction from '../../hooks/useAction'
import { useState } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/forms/Input'
import Modal from '../../components/ui/Modal'
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog'
import * as adminService from '../../services/admin/adminService'


// The roles are predefined by the system. This page only shows them and what each role can do.
export default function Announcements() {
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

