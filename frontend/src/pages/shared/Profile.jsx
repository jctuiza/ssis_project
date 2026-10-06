import { useRef, useState } from 'react'
import { Camera, KeyRound, Mail, Pencil, ShieldCheck, GraduationCap, Trash2 } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import InfoGrid from '../../components/common/InfoGrid'
import StatusBadge from '../../components/common/StatusBadge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ChangePasswordForm from '../../components/account/ChangePasswordForm'
import { useSession } from '../../context/session'
import { useToast } from '../../context/toast'
import { fileToAvatar } from '../../utils/image'
import { validateProfile } from '../../utils/validation'
import * as accountService from '../../services/accountService'

// Profile page shared by every role (student, admin, registrar, cashier, department and custom roles).
export default function Profile() {
  const { user, updateUser } = useSession()
  const { notify } = useToast()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({}) // { fieldKey: 'message' } shown under each field
  const [saving, setSaving] = useState(false)
  const isStudent = user.role === 'student'

  const items = isStudent
    ? [
        { label: 'Student ID', value: user.id },
        { label: 'Full name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Contact number', value: user.contact },
        { label: 'Birthday', value: user.birthday },
        { label: 'Age', value: user.age },
        { label: 'Address', value: user.address },
        { label: 'Program', value: user.program },
        { label: 'Year level', value: user.yearLevel },
        { label: 'Department', value: user.department },
        { label: 'Emergency contact', value: [user.emergencyName, user.emergencyContact].filter(Boolean).join(' · ') },
        { label: 'Account status', value: <StatusBadge status={user.status} /> },
      ]
    : [
        { label: 'Username', value: user.id },
        { label: 'Full name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Contact number', value: user.contact },
        { label: 'Role', value: user.roleLabel },
        { label: 'Department', value: user.departmentId ? user.department : 'All offices' },
        { label: 'Account status', value: <StatusBadge status={user.status} /> },
      ]
  const Icon = isStudent ? GraduationCap : ShieldCheck

  const openEdit = () => {
    setErrors({})
    setForm({
      ...(isStudent ? {} : { name: user.name }),
      email: user.email,
      contact: user.contact ?? '',
      ...(isStudent ? { address: user.address ?? '', emergencyName: user.emergencyName ?? '', emergencyContact: user.emergencyContact ?? '' } : {}),
    })
    setEditing(true)
  }

  const closeEdit = () => {
    setEditing(false)
    setErrors({})
  }

  const validate = (values) => validateProfile(values, { canEditName: !isStudent })

  // Updates a value. A field that shows an error is re-checked on every change,
  // so its message disappears as soon as the input becomes valid.
  const change = (key) => (e) => {
    const values = { ...form, [key]: e.target.value }
    setForm(values)
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

  // Props shared by every field: id/name, value, change handler and the inline error.
  const field = (key) => ({ name: `profile-${key}`, value: form[key] ?? '', onChange: change(key), error: errors[key] })

  const focusFirst = (found) => {
    const first = ['name', 'email', 'contact'].find((key) => found[key])
    if (first) document.getElementById(`profile-${first}`)?.focus()
  }

  const saveProfile = async () => {
    const found = validate(form)
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirst(found)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      updateUser(await accountService.updateProfile(form)) // header, welcome message and profile all read the session
      notify('Profile updated.')
      closeEdit()
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

  const savePhoto = async (photo, message) => {
    setBusy(true)
    try {
      await accountService.updateProfilePhoto(photo)
      updateUser({ photo }) // header menu and profile (and the Student ID for students) read user.photo
      notify(message)
    } catch (err) {
      notify(err.message ?? 'Could not update your picture.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const photo = await fileToAvatar(file)
      await savePhoto(photo, isStudent ? 'Profile picture updated. It is now also on your Student ID.' : 'Profile picture updated.')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeader
        eyebrow="Profile"
        action={<Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" />Edit profile</Button>}
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm dark:border-white/10 dark:bg-[#26272c] dark:shadow-none">
        <div className="h-28 bg-violet-500" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-10 flex items-end gap-4">
            <Avatar src={user.photo} name={user.name} icon={Icon} className="h-20 w-20 rounded-2xl border-4 border-surface shadow-sm dark:border-[#26272c]" iconClassName="h-9 w-9" />
            <div className="min-w-0 pb-1">
              <h3 className="truncate text-xl font-semibold text-slate-900 dark:text-white">{user.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="sr-only" aria-label="Choose profile picture" />
            <Button size="sm" loading={busy} onClick={() => fileRef.current?.click()}><Camera className="h-3.5 w-3.5" />Change picture</Button>
            {user.photo && (
              <Button size="sm" variant="ghost" disabled={busy} className="!text-rose-500" onClick={() => savePhoto(null, 'Profile picture removed.')}>
                <Trash2 className="h-3.5 w-3.5" />Remove
              </Button>
            )}
            <p className="w-full text-xs text-slate-400">
              {isStudent ? 'Your picture also appears on your Student ID.' : 'Your picture appears in the header and on your profile.'}
            </p>
          </div>

          <div className="mt-8"><InfoGrid items={items} /></div>
        </div>
      </section>

      <Card title="Change password" description="Choose a password only you know. You will stay signed in on this device.">
        <div className="max-w-md"><ChangePasswordForm /></div>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><KeyRound className="h-3.5 w-3.5" />Forgot your password? Ask the administrator to reset it.</p>
      </Card>

      <Modal
        open={editing}
        title="Edit profile"
        description={isStudent ? 'Only the details you are allowed to change are shown.' : 'You can change your name, email and contact number. Your role and department are managed by the administrator.'}
        onClose={closeEdit}
        footer={<><Button variant="outline" onClick={closeEdit}>Cancel</Button><Button loading={saving} onClick={saveProfile}>Save changes</Button></>}
      >
        <div className="grid gap-4">
          {!isStudent && <Input label="Full name" autoComplete="name" {...field('name')} />}
          <Input label="Email" type="email" autoComplete="email" {...field('email')} />
          <Input label="Contact number" type="tel" autoComplete="tel" {...field('contact')} />
          {isStudent && (
            <>
              <Input label="Address" {...field('address')} />
              <Input label="Emergency contact person" {...field('emergencyName')} />
              <Input label="Emergency contact number" type="tel" {...field('emergencyContact')} />
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}