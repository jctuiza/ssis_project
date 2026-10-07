import { useState } from 'react'
import { useToast } from '../context/toast'

// Runs an async admin action with a spinner flag and an error toast.
export default function useAction() {
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
