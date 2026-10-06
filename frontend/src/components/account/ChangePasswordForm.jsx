import { useState } from 'react'
import Button from '../common/Button'
import Input from '../common/Input'
import { useToast } from '../../context/toast'
import { passwordIssue } from '../../utils/password'
import * as accountService from '../../services/accountService'

// Used on the Profile page and on the forced "choose a new password" screen.
export default function ChangePasswordForm({ onDone, currentLabel = 'Current password' }) {
  const { notify } = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.current) next.current = 'Enter your current password.'
    const issue = passwordIssue(form.next)
    if (issue) next.next = issue
    if (form.confirm !== form.next) next.confirm = 'The passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      await accountService.changePassword({ currentPassword: form.current, newPassword: form.next })
      notify('Password changed.')
      setForm({ current: '', next: '', confirm: '' })
      onDone?.()
    } catch (err) {
      setErrors({ current: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Input label={currentLabel} type="password" autoComplete="current-password" value={form.current} onChange={set('current')} error={errors.current} />
      <Input label="New password" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} error={errors.next} />
      <Input label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      <p className="text-xs text-slate-500 dark:text-slate-400">Use at least 8 characters with letters and numbers.</p>
      <div><Button type="submit" loading={saving}>Change password</Button></div>
    </form>
  )
}
