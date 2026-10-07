// Tuition payments (full or installment) and document fees. Paid amounts, balances and Fully Paid / Partially Paid / Unpaid
// are derived from the transaction ledger on the server. Students can only VIEW their account; the Cashier records every payment.
import { api, enc } from '../../api/apiClient'

// GET /api/payments/student/:id   (read-only; a student can only open their own account)
export const getAccountForStudent = (studentId) => api.get(`/payments/student/${enc(studentId)}`)

// GET /api/assessments
export const getAssessments = () => api.get('/assessments')

// GET /api/transactions   (Cashier, and the Admin in read-only mode)
export const getTransactions = () => api.get('/transactions')

// POST /api/assessments/:id/payments   { amount, method }   (the Cashier records a payment received face-to-face)
export const recordPayment = (assessmentId, { amount, method = 'Cash' }) => api.post(`/assessments/${assessmentId}/payments`, { amount, method })

// GET /api/document-payments   (document requests the Registrar approved: fee waiting, paid, or already released)
export const getDocumentPayments = () => api.get('/document-payments')

// POST /api/document-payments/:ref   { method }   (the Cashier records the document fee received face-to-face)
export const recordDocumentPayment = (ref, { method = 'Cash' } = {}) => api.post(`/document-payments/${enc(ref)}`, { method })


