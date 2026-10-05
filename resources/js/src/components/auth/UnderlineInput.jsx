import { useState } from 'react'

// Underline-style input used on the login page. type="password" adds a show/hide toggle.
export default function UnderlineInput({ label, type = 'text', error, invalid = false, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const hasError = Boolean(error) || invalid

  return (
    <div>
      <div className={`relative border-b-2 transition focus-within:border-violet-500 ${hasError ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'}`}>
        <input
          aria-label={label}
          aria-invalid={hasError}
          placeholder={label}
          type={isPassword && show ? 'text' : type}
          className="w-full bg-transparent py-2.5 pr-9 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {!show && <path d="M4 4l16 16" />}
            </svg>
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  )
}
