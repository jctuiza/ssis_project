import { api, enc } from '../../api/apiClient'

// GET /api/grades/terms/:studentId   (grades per academic year and semester, oldest first)
export const getTermsForStudent = (studentId) => api.get(`/grades/terms/${enc(studentId)}`)

// GET /api/grades
export const getAll = () => api.get('/grades')

// PATCH /api/grades/:id   { prelim, midterm, finals }   (percentages 0-100, null = not posted yet)
export const updateGrade = (id, { prelim, midterm, finals }) => api.patch(`/grades/${id}`, { prelim, midterm, finals })


