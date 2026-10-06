import { GraduationCap } from 'lucide-react'
import Avatar from '../common/Avatar'
import { cardClass } from '../../utils/styles'

const shell = `${cardClass} mx-auto flex min-h-[520px] w-full max-w-[340px] flex-col overflow-hidden`

// Decorative barcode derived from the student number.
function Barcode({ value }) {
  let x = 0
  const bars = []
  ;[...value].forEach((ch, i) => {
    const n = ch.charCodeAt(0)
    ;[1 + (n % 3), 1 + ((n * 7) % 2), 1 + ((n * 3) % 3)].forEach((w, j) => {
      if (j % 2 === 0) bars.push(<rect key={`${i}-${j}`} x={x} y="0" width={w} height="28" />)
      x += w + 1
    })
  })
  return (
    <svg viewBox={`0 0 ${x} 28`} preserveAspectRatio="none" fill="currentColor" aria-hidden="true" className="h-7 w-full text-slate-700 dark:text-slate-300">
      {bars}
    </svg>
  )
}

function Header({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3 bg-violet-500 px-5 py-4 text-white">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20"><GraduationCap className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-white/80">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium text-slate-800 dark:text-slate-100">{value || '—'}</dd>
    </div>
  )
}

export default function StudentIDCard({ card, photo }) {
  return (
    <div className="grid justify-items-center gap-6 md:grid-cols-2">
      {/* FRONT */}
      <article className={shell} aria-label="Student ID front">
        <Header title="Student Services" subtitle="Official Student ID" />
        <div className="flex flex-1 flex-col items-center px-5 py-6 text-center">
          <Avatar
            src={photo}
            name={card.name}
            className="h-36 w-36 rounded-2xl border-4 border-violet-100 shadow-sm dark:border-violet-500/20"
            iconClassName="h-16 w-16"
          />
          <h3 className="mt-4 text-lg font-semibold leading-tight text-slate-900 dark:text-white">{card.name}</h3>
          <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-300">{card.program}</p>

          <div className="mt-4 rounded-xl bg-violet-50 px-4 py-2 dark:bg-violet-500/10">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Student number</p>
            <p className="text-base font-semibold tracking-wider text-slate-900 dark:text-white">{card.id}</p>
          </div>

          <div className="mt-auto w-full pt-6">
            <p className="truncate text-2xl leading-none text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Caveat','Brush Script MT','Segoe Script',cursive" }}>
              {card.signature}
            </p>
            <div className="mt-1 border-t border-slate-300 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-600">Signature</div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 dark:border-white/10">
          <Barcode value={card.id} />
          <p className="mt-1.5 text-center text-[10px] text-slate-400">{card.term}</p>
        </div>
      </article>

      {/* BACK */}
      <article className={shell} aria-label="Student ID back">
        <Header title="Student Information" subtitle={card.id} />
        <div className="flex flex-1 flex-col px-5 py-5">
          <dl className="grid gap-3.5">
            <Field label="Address" value={card.address} />
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Birthday" value={card.birthday} />
              <Field label="Contact number" value={card.contact} />
            </div>
            <Field label="Email address" value={card.email} />
          </dl>

          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">In case of emergency</p>
            <dl className="grid gap-2.5">
              <Field label="Contact person" value={card.emergencyName} />
              <Field label="Contact number" value={card.emergencyContact} />
            </dl>
          </div>

          <p className="mt-auto pt-5 text-center text-[10px] leading-4 text-slate-400">
            This card is issued by the university and is non-transferable. If found, please return it to the Registrar's Office.
          </p>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 dark:border-white/10">
          <Barcode value={card.id} />
        </div>
      </article>
    </div>
  )
}
