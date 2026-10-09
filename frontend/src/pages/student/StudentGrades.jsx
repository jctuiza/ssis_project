import StatusBadge from '../../components/ui/StatusBadge'
import Skeleton from '../../components/loading/Skeleton'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { useState } from 'react'
import Card from '../../components/ui/Card'
import Select from '../../components/forms/Select'
import AsyncView from '../../components/feedback/AsyncView'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as gradeService from '../../services/shared/gradeService'
import PageHeader from '../../components/ui/PageHeader'

const termLabel = (t) => `A.Y. ${t.academicYear}, ${t.semester}`
const show = (value) => (value == null ? '--' : Number(value).toFixed(2))

const th = 'px-4 py-3 text-left font-semibold text-slate-900 dark:text-white'
const thCenter = 'px-4 py-3 text-center font-semibold text-slate-900 dark:text-white'
const td = 'px-4 py-3.5 text-slate-700 dark:text-slate-200'
const tdCenter = 'px-4 py-3.5 text-center text-slate-700 dark:text-slate-200'

export default function StudentGrades() {
  const { user } = useSession()
  const { data: terms, loading, error } = useService(() => gradeService.getTermsForStudent(user.id), [user.id], "pages/student/StudentGrades.jsx:1")
  const [selectedId, setSelectedId] = useState('')

  // Terms are ordered oldest to newest, so the latest one is the default.
  const loadedTerm = terms?.find((t) => t.id === selectedId) ?? terms?.[terms.length - 1]

  const waiting = loading && terms == null
  const current = loadedTerm ?? { id: '', semester: '', academicYear: '', program: user.program, courses: [] }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Grades"/>
      <>
      {error && <p role="alert" className="text-sm text-rose-500">{error.message}</p>}
        {terms && !loadedTerm && (
          <Card><p className="text-sm text-slate-500 dark:text-slate-400">No grades have been posted yet.</p></Card>
        )}

        {current && (
          <>
            <Select
              id="grade-term"
              aria-label="Academic year and semester"
              value={current.id}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={waiting || !terms?.length}
              options={(terms ?? []).map((t) => ({ value: t.id, label: termLabel(t) }))}
              className="w-full sm:max-w-sm"
            />

            <Card
              padded={false}
              title={waiting ? 'Grades' : loadedTerm ? `${current.semester} A.Y. ${current.academicYear}` : 'Grades'}
              action={<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{current.program}</span>}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className={th}>Course Code</th>
                      <th className={th}>Course Description</th>
                      <th className={thCenter}>Units</th>
                      <th className={thCenter}>Prelim</th>
                      <th className={thCenter}>Midterm</th>
                      <th className={thCenter}>Finals</th><th className={thCenter}>Final grade</th><th className={thCenter}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {waiting && Array.from({length:8},(_,i)=><tr key={`loading-${i}`}>{Array.from({length:8},(_,j)=><td key={j} className={td}><Skeleton className="h-5 w-full" /></td>)}</tr>)}
                    {current.courses.map((c) => (
                      <tr key={c.code} className="transition hover:bg-page dark:hover:bg-white/[0.03]">
                        <td className={td}>{c.code}</td>
                        <td className={td}>{c.description}</td>
                        <td className={tdCenter}>{c.units}</td>
                        <td className={tdCenter}>{show(c.prelim)}</td>
                        <td className={tdCenter}>{show(c.midterm)}</td>
                        <td className={tdCenter}>{show(c.finals)}</td><td className={tdCenter}>{show(c.finalGrade)}</td><td className={tdCenter}><StatusBadge status={c.status ?? 'Incomplete'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </>
    </div>
  )
}

