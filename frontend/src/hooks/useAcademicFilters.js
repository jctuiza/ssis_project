import { useState } from 'react'
import useService from './useService'
import { programsForDepartment } from '../config/programs'
import * as adminService from '../services/admin/adminService'

export default function useAcademicFilters() {
  const departments = useService(adminService.getDepartments, [], 'academic:departments')
  const [departmentId, setDepartment] = useState('')
  const [program, setProgram] = useState('')
  const [subject, setSubject] = useState('')
  const selectDepartment = (value) => { setDepartment(value); setProgram(''); setSubject('') }
  const selectProgram = (value) => { setProgram(value); setSubject('') }
  return { departments, departmentId, program, subject, selectDepartment, selectProgram, setSubject,
    programs: programsForDepartment(departments.data, departmentId), ready: Boolean(departmentId && program) }
}
