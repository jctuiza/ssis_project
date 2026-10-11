import { useState } from 'react'
import useService from './useService'
import * as adminService from '../services/admin/adminService'
import { termKey, termParts, termView } from '../utils/academicTerm'

export default function useAcademicTerm() {
  const settings = useService(adminService.getSettings, [], 'academic:settings')
  const [selection, setSelection] = useState(null)
  const activeTerm = settings.data?.currentTerm
  const view = termView(activeTerm, selection)
  const choose = (field, value) => setSelection({ sourceKey: termKey(activeTerm), ...view, [field]: value })
  return { settings, activeTerm, active: termParts(activeTerm), ...view,
    setYear: value => choose('year', value), setSemester: value => choose('semester', value),
    reset: () => setSelection(null), historical: view.year !== termParts(activeTerm).year || view.semester !== termParts(activeTerm).semester }
}
