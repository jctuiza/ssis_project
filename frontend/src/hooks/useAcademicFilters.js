import { useSession } from '../context/session'
import { useState } from 'react'
import useService from './useService'
import { programsForDepartment } from '../config/programs'
import * as adminService from '../services/admin/adminService'

export default function useAcademicFilters() {
  const { user } = useSession()
  const departments = useService(adminService.getDepartments, [], 'academic:departments')
  const [departmentId, setDepartment] = useState(user?.departmentId ? String(user.departmentId) : '')
  const [program, setProgram] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [subject, setSubject] = useState('')
  const selectDepartment = (value) => { setDepartment(user?.departmentId ? String(user.departmentId) : value); setProgram(''); setSubject('') }
  const selectProgram = (value) => { setProgram(value); setSubject(''); setYearLevel('') }
  const policy = departments.data?.find(d=>String(d.id) === String(departmentId))?.programDetails?.find(p=>p.name === program)
  const yearOptions = Array.from({length: 5}, (_,i)=>({value:String(i+1),label:['First Year','Second Year','Third Year','Fourth Year','Fifth Year'][i]}))
  return { policy, yearLevel, setYearLevel, yearOptions, departments, departmentId, program, subject, selectDepartment, selectProgram, setSubject,
    programs: programsForDepartment(departments.data, departmentId), ready: Boolean(departmentId && program) }
}
