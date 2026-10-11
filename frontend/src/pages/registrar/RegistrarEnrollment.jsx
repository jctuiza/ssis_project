import useAcademicTerm from '../../hooks/useAcademicTerm'
import AdmissionApplications from './AdmissionApplications'
import EnrollmentRequests from '../shared/EnrollmentRequests'

export default function RegistrarEnrollment() {
  const { activeTerm, settings } = useAcademicTerm()
  return <div className="space-y-8"><p className="text-sm text-slate-500">Active academic term: {activeTerm ?? 'Loading…'}. Application and request tables retain their recorded terms.</p>{settings.error && <p role="alert" className="text-sm text-rose-500">{settings.error.message} <button className="underline" onClick={settings.reload}>Retry</button></p>}<AdmissionApplications /><EnrollmentRequests /></div>
}
