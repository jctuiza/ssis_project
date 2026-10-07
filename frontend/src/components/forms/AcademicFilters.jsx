import Select from './Select'
import Card from '../ui/Card'

export default function AcademicFilters({ filters, subjects, children }) {
  return <Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Select label="Department" placeholder="Select department" value={filters.departmentId}
      disabled={filters.departments.loading} options={(filters.departments.data ?? []).map(d => ({ value: d.id, label: `${d.code} – ${d.name}` }))}
      onChange={event => filters.selectDepartment(event.target.value)} />
    <Select label="Course / Program" placeholder="Select program" value={filters.program}
      disabled={!filters.departmentId} options={filters.programs} onChange={event => filters.selectProgram(event.target.value)} />
    {subjects && <Select label="Subject" placeholder="Select subject" value={filters.subject}
      disabled={!filters.ready || subjects.loading} options={(subjects.data ?? []).map(s => ({ value: s.code, label: `${s.code} – ${s.name}` }))}
      onChange={event => filters.setSubject(event.target.value)} />}
    {children}
  </div>
  {filters.departments.error && <p role="alert" className="mt-3 text-sm text-rose-500">Departments could not be loaded. <button type="button" className="underline" onClick={filters.departments.reload}>Retry</button></p>}
  {subjects?.error && <p role="alert" className="mt-3 text-sm text-rose-500">Subjects could not be loaded. <button type="button" className="underline" onClick={subjects.reload}>Retry</button></p>}
  </Card>
}
