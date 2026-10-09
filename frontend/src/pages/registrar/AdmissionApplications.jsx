import { useState } from 'react'
import ResourcePage from '../../components/dashboard/ResourcePage'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import { useToast } from '../../context/toast'
import * as admissions from '../../services/shared/admissionService'
export default function AdmissionApplications() {
  const { notify } = useToast()
  const [viewing, setViewing] = useState(null)
  const [decision, setDecision] = useState(null)
  const [requirements, setRequirements] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [emailing, setEmailing] = useState(false)
  const [mailMessage, setMailMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const refreshRequirements = async id => {
    setChecking(true); setCheckError(''); setRequirements(null)
    try { setRequirements(await admissions.checkReadiness(id)) }
    catch (error) { setCheckError(error.message) }
    finally { setChecking(false) }
  }
  const review = (row, status) => {
    setRequirements(null); setCheckError(''); setDecision({ row, status })
    if (status === 'Accepted') refreshRequirements(row.id)
  }
  const confirm = async () => {
    if (saving || checking || !decision || (decision.status === 'Accepted' && !requirements?.ready)) return
    setSaving(true)
    try { const result = await admissions.decide(decision.row.id, decision.status); if (result.credentials) { setCredentials({ ...result, id: decision.row.id }); setMailMessage('') } notify(`Application ${decision.status.toLowerCase()}.`); setDecision(null); setViewing(null) }
    catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  const showCredentials = async row => {
    if (saving) return
    setSaving(true)
    try { setCredentials(await admissions.getCredentials(row.id)); setMailMessage('') }
    catch (error) { notify(error.message, 'error') }
    finally { setSaving(false) }
  }
  const copyCredentials = async () => {
    try {
      const c = credentials.credentials
      await navigator.clipboard.writeText(`To: ${credentials.email}\nStudent ID: ${c.studentNumber}\nUsername: ${c.username}\nTemporary password: ${c.temporaryPassword}\nPlease change your password on first login.`)
      setMailMessage('Copied. Provide these details securely to the student.')
    } catch { setMailMessage('Clipboard unavailable. Select and copy the displayed details.') }
  }
  const sendCredentials = async () => {
    if (emailing) return
    setEmailing(true)
    try { const result = await admissions.emailCredentials(credentials.id); notify(result.message); setCredentials(null) }
    catch (error) { setMailMessage(error.message) }
    finally { setEmailing(false); setRefresh(v=>v+1) }
  }
  return <>
    <ResourcePage eyebrow="Online applications" title="First-year applications" description="Review applications submitted through the public online enrollment page."
      load={admissions.getApplications} deps={[refresh]} columns={[
        { key:'reference', label:'Reference' }, { key:'name',label:'Applicant',sortable:true }, { key:'program',label:'Program' },
        { key:'department',label:'Department' }, { key:'appliedOn',label:'Applied on',render:r=>new Date(r.appliedOn).toLocaleDateString() },
        {key:'emailStatus',label:'Credential email'}, {key:'emailAttempts',label:'Email attempts'}, { key:'status',label:'Status',render:r=><StatusBadge status={r.status} /> },
      ]} searchKeys={['name','email','reference','program']} filter={{ key:'status',options:['Pending','Accepted','Declined'] }}
      actions={r=><><Button variant="ghost" size="sm" onClick={()=>setViewing(r)}>View</Button>{r.status === 'Pending' && <><Button size="sm" disabled={saving} onClick={()=>review(r,'Accepted')}>Accept</Button><Button variant="outline" size="sm" disabled={saving} onClick={()=>review(r,'Declined')}>Decline</Button></>}{r.status === 'Accepted' && r.credentialsAvailable && <Button variant="outline" size="sm" disabled={saving} onClick={()=>showCredentials(r)}>Login credentials</Button>}</>} />
    <Modal open={Boolean(viewing)} title={viewing?.name} onClose={()=>setViewing(null)} footer={<Button variant="outline" onClick={()=>setViewing(null)}>Close</Button>}>
      {viewing && <InfoGrid items={['reference','email','contact','gender','birthdate','department','program','term','status','appliedOn','reviewedOn','decisionNote'].map(key=>({ label:key,value:viewing[key] ?? '—' }))} />}
    </Modal>
    <Modal open={Boolean(decision)} title={`${decision?.status === 'Accepted' ? 'Accept' : 'Decline'} application`} onClose={()=>!saving && !checking && setDecision(null)} footer={<><Button variant="outline" disabled={saving || checking} onClick={()=>setDecision(null)}>Cancel</Button><Button loading={saving || checking} disabled={decision?.status === 'Accepted' && !requirements?.ready} onClick={confirm}>Confirm</Button></>}>
      <p className="text-sm text-slate-500">{decision?.status === 'Accepted' ? 'Confirm this application and create the student login account?' : 'Confirm declining this application?'}</p>
      {decision?.status === 'Accepted' && <div className="mt-4 space-y-3 text-sm">{checking && <p role="status">Checking subject assignments…</p>}{checkError && <p role="alert" className="text-rose-500">{checkError}</p>}{requirements && <><p>{requirements.program} · {requirements.yearLevel} · {requirements.semester} · A.Y. {requirements.academicYear}</p>{requirements.ready ? <p>{requirements.matchingSubjects} matching subject(s) found.</p> : <p role="alert" className="text-amber-600">{requirements.reason}</p>}</>}{!checking && <Button variant="outline" size="sm" onClick={()=>refreshRequirements(decision.row.id)}>Recheck subjects</Button>}</div>}
    </Modal>
    <Modal open={Boolean(credentials)} title="Student login credentials" description="Enrollment confirmed. Provide these details privately to the student." onClose={()=>!emailing && setCredentials(null)} footer={<><Button variant="outline" disabled={emailing} onClick={copyCredentials}>Copy details</Button><Button loading={emailing} disabled={!credentials?.emailConfigured} onClick={sendCredentials}>Send Credentials</Button><Button variant="outline" disabled={emailing} onClick={()=>setCredentials(null)}>Done</Button></>}>
      {credentials && <><InfoGrid items={[{ label:'Email',value:credentials.email },{ label:'Student ID',value:credentials.credentials.studentNumber },{ label:'Username',value:credentials.credentials.username },{ label:'Temporary password',value:credentials.credentials.temporaryPassword }]} /><p className="mt-4 text-sm text-slate-500">The student must change this password on first login. Temporary details are available to the Registrar for up to seven days, until emailed or changed.</p>{!credentials.emailConfigured && <p className="mt-3 text-sm text-amber-600">Email is not configured. Copy and provide the details securely. Once a delivery mailer is configured, reopen Login credentials to send them.</p>}{mailMessage && <p role="status" className="mt-3 text-sm">{mailMessage}</p>}</>}
    </Modal>
  </>
}
