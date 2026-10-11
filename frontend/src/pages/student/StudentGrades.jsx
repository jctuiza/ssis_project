import useAcademicTerm from '../../hooks/useAcademicTerm'
import { gradeTermFor, termKey } from '../../utils/academicTerm'
import StatusBadge from '../../components/ui/StatusBadge'
import Skeleton from '../../components/loading/Skeleton'
import { useState } from 'react'
import Card from '../../components/ui/Card'
import Select from '../../components/forms/Select'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as gradeService from '../../services/shared/gradeService'
import PageHeader from '../../components/ui/PageHeader'

const yearLabels = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
]
const termLabel = (t) => `${yearLabels[Number(t.yearLevel) - 1] ? `${yearLabels[Number(t.yearLevel) - 1]} · ` : ''}A.Y. ${t.academicYear}, ${t.semester}`
const show = (value) => (value == null ? '--' : Number(value).toFixed(2))

const th = 'px-4 py-3 text-left font-semibold text-slate-900 dark:text-white'
const thCenter = 'px-4 py-3 text-center font-semibold text-slate-900 dark:text-white'
const td = 'px-4 py-3.5 text-slate-700 dark:text-slate-200'
const tdCenter = 'px-4 py-3.5 text-center text-slate-700 dark:text-slate-200'

export default function StudentGrades() {
  const { user } = useSession()
  const { data: terms, loading, error } = useService(() => gradeService.getTermsForStudent(user.id), [user.id], "pages/student/StudentGrades.jsx:1")
  const term = useAcademicTerm()
  
  const [selection, setSelection] = useState(null)
  const [yearSelection, setYearSelection] = useState('all')

  const recordedTerms = terms ?? []
  const yearFilteredTerms =
    yearSelection === 'all'
      ? recordedTerms
      : recordedTerms.filter(
          t => String(t.yearLevel ?? t.year_level ?? '') === yearSelection
        )

  const loadedTerm = gradeTermFor(
    yearFilteredTerms,
    term.activeTerm,
    selection,
    user.program
  )

  const waiting =
    (loading && terms == null) ||
    (term.settings.loading && !term.settings.data)

  const current = loadedTerm ?? {
    id: '',
    semester: '',
    academicYear: '',
    program: user.program,
    courses: [],
  }

  const options =
    loadedTerm && !yearFilteredTerms.some(t => t.id === loadedTerm.id)
      ? [loadedTerm, ...yearFilteredTerms]
      : yearFilteredTerms
return (
    <div className="space-y-6">
      <PageHeader eyebrow="Grades"/>
      <p className="text-sm text-slate-500">Active academic term: {term.activeTerm ?? 'Loading…'}{loadedTerm && (loadedTerm.academicYear !== term.active.year || loadedTerm.semester !== term.active.semester) && <> · Viewing recorded term: {termLabel(loadedTerm)}</>}</p>
      <>
      {term.settings.error && <p role="alert" className="text-sm text-rose-500">{term.settings.error.message} <button className="underline" onClick={term.settings.reload}>Retry</button></p>}
      {error && <p role="alert" className="text-sm text-rose-500">{error.message}</p>}
        {terms && !current.courses.length && (
          <Card><p className="text-sm text-slate-500 dark:text-slate-400">No grades are available for this selected academic term.</p></Card>
        )}

        {current && (
          <>   
            <Select
              id="grade-year"
              aria-label="Enrollment year"
              value={yearSelection}
              onChange={value => {
                setYearSelection(value)
                setSelection(null)
              }}
              options={[
                { value: 'all', label: 'All enrollment years' },
                { value: '1', label: 'Year 1' },
                { value: '2', label: 'Year 2' },
                { value: '3', label: 'Year 3' },
                { value: '4', label: 'Year 4' },
                { value: '5', label: 'Year 5' },
              ]}
            />
            <Select
              id="grade-term"
              aria-label="Academic year and semester"
              value={current.id}
              onChange={(e) => setSelection({ sourceKey: termKey(term.activeTerm), id: e.target.value })}
              disabled={waiting || !options.length}
              options={options.map((t) => ({ value: t.id, label: termLabel(t) }))}
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
                      <tr key={c.id ?? c.code} className="transition hover:bg-page dark:hover:bg-white/[0.03]">
                        <td className={td}>{c.code}</td>
                        <td className={td}>
                          <div>{c.description}</div>

                          {c.retake && (
                            <div className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              Retake
                            </div>
                          )}

                          {(c.previousAttempts ?? []).length > 0 && (
                            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <div className="font-medium">Previous attempts</div>
                              {c.previousAttempts.map((attempt, index) => (
                                <div key={attempt.id ?? index}>
                                  {attempt.academicYear} · {attempt.semester} ·{' '}
                                  {attempt.finalGrade == null
                                    ? '--'
                                    : Number(attempt.finalGrade).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
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

