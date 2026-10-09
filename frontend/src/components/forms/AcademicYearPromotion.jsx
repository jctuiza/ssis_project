import Modal from '../ui/Modal'
import StatusBadge from '../ui/StatusBadge'
import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from './Input'
import DataTable from '../tables/DataTable'
import ConfirmationDialog from '../feedback/ConfirmationDialog'
import { useToast } from '../../context/toast'
import * as academic from '../../services/shared/academicService'
export default function AcademicYearPromotion() {
  const { notify } = useToast()
  const [targetTerm, setTargetTerm] = useState('')
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [records, setRecords] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const load = async () => {
    if (busy) return
    setBusy(true)
    try { const result=await academic.previewPromotions(targetTerm); setPreview(result); setSelected([]) }
    catch (error) { setPreview(null); notify(error.message,'error') }
    finally { setBusy(false) }
  }
  const activate = async () => {
    if (busy || !preview) return
    setBusy(true)
    try { const result=await academic.activateYear({targetTerm:preview.targetTerm,sourceTerm:preview.sourceTerm,studentIds:selected,reviewed:true}); notify(result.message); setPreview(null); setConfirm(false) }
    catch (error) { notify(error.message,'error'); setConfirm(false) }
    finally { setBusy(false) }
  }
  return <Card title="Activate academic year and review promotions" description="Required subject records in both semesters are checked using a passing grade of 60. First through Fourth Year can advance; Fifth Year remains at the final level. Select only students approved under your institution’s progression policy. Held students keep their year level.">
    <Input label="Next academic term" placeholder="1st Semester, A.Y. 2027-2028" value={targetTerm} disabled={busy} onChange={e=>{setTargetTerm(e.target.value);setPreview(null)}} />
    <div className="mt-3"><Button loading={busy} onClick={load}>Preview promotions</Button></div>
    {preview && <><p className="mt-4 text-sm">From {preview.sourceTerm} to {preview.targetTerm}. Enrollment will be closed after activation.</p><DataTable rows={preview.students} rowKey="id" columns={[{key:'studentId',label:'Student ID'},{key:'name',label:'Student'},{key:'program',label:'Program'},{key:'fromYear',label:'Current year',render:row=>['First Year','Second Year','Third Year','Fourth Year','Fifth Year'][row.fromYear-1] ?? 'Unknown'},{key:'toYear',label:'Proposed next year',render:row=>['First Year','Second Year','Third Year','Fourth Year','Fifth Year'][row.toYear-1] ?? 'Review required'},{key:'passedSubjects',label:'Passed'},{key:'failedSubjects',label:'Failed',render:row=>row.failedSubjects.map(s=>s.code).join(', ') || 'None'},{key:'incompleteSubjects',label:'Incomplete',render:row=>row.incompleteSubjects.map(s=>s.code).join(', ') || 'None'},{key:'reason',label:'Eligibility review'}]} actions={row=><div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={()=>setRecords(row)}>View records</Button><input aria-label={`Approve promotion for ${row.studentId}`} type="checkbox" disabled={!row.eligible || busy} checked={selected.includes(row.id)} onChange={e=>setSelected(e.target.checked ? [...selected,row.id] : selected.filter(id=>id!==row.id))} /></div>} /><div className="mt-4"><Button disabled={busy} onClick={()=>setConfirm(true)}>Review activation ({selected.length} promotions)</Button></div></>}
    <Modal open={Boolean(records)} size="lg" title="Academic records for promotion" description={records ? `${records.studentId} · ${records.name} · A.Y. ${records.academicYear}` : ''} onClose={()=>setRecords(null)} footer={<Button variant="outline" onClick={()=>setRecords(null)}>Close</Button>}>
      {records && <><p className="mb-4 text-sm">{records.reason}</p><DataTable rowKey="key" rows={records.records.map(r=>({...r,key:`${r.semester}:${r.code}`}))} columns={[{key:'code',label:'Subject code'},{key:'subject',label:'Subject'},{key:'semester',label:'Semester'},{key:'finalGrade',label:'Final grade',render:r=>r.finalGrade == null ? '--' : Number(r.finalGrade).toFixed(2)},{key:'status',label:'Status',render:r=><StatusBadge status={r.status} />}]} empty="No completed academic records are available for this review." /></>}
    </Modal>
    <ConfirmationDialog open={confirm} title="Activate academic year" message={`Confirm ${selected.length} reviewed promotions and activate ${preview?.targetTerm}? Other students keep their current year level. Enrollment will remain closed.`} loading={busy} confirmLabel="Confirm" onConfirm={activate} onCancel={()=>!busy && setConfirm(false)} />
  </Card>
}
