import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

// One-time display of generated login details. The password is never shown again after this dialog closes.
// fields: [{ label, value }]
export default function CredentialsDialog({ open, title, description, fields = [], onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fields.map((f) => `${f.label}: ${f.value}`).join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable: the details are still visible on screen.
    }
  }
  return (
    <Modal
      open={open}
      size="sm"
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy details'}</Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <dl className="space-y-3">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg bg-violet-50 px-4 py-3 dark:bg-violet-500/10">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
            <dd className="mt-0.5 select-all font-mono text-base font-semibold text-slate-900 dark:text-white">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Share these details with the account owner. This password is shown only once, and they must choose a new one the first time they log in.
      </p>
    </Modal>
  )
}


