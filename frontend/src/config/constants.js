export const OFFICES = ['Registrar', 'Cashier', 'Department']

// Document request lifecycle (Rejected is possible at any open step before payment is recorded).
// Submitted -> Under Review -> Approved -> Pending Payment -> Payment Recorded -> Processing -> Ready for Release -> Completed
// "Approved" is the Registrar's decision: it immediately forwards the request to the Cashier as "Pending Payment".
export const DOCUMENT_FLOW = ['Submitted', 'Under Review', 'Approved', 'Pending Payment', 'Payment Recorded', 'Processing', 'Ready for Release', 'Completed']
export const DOCUMENT_STATUSES = [...DOCUMENT_FLOW, 'Rejected']
export const CLEARANCE_STATUSES = ['Cleared', 'Pending', 'On Hold']
export const ENROLLMENT_STATUSES = ['Enrolled', 'Pending', 'Rejected', 'Not Enrolled']
export const PAYMENT_STATUSES = ['Fully Paid', 'Partially Paid', 'Unpaid']
export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
export const TRANSACTION_STATUSES = ['Paid', 'Pending', 'Cancelled']
export const SEMESTERS = ['First Semester', 'Second Semester']
export const PAYMENT_METHODS = ['Cash', 'GCash', 'Bank transfer']

// The clearance office a permission lets a user update.
// Cashier clearance is not edited by hand: it follows the student's tuition balance automatically.
export const CLEARANCE_OFFICE_BY_PERMISSION = { 'clearance.registrar': 'Registrar', 'clearance.department': 'Department' }

// Moves a staff member can make by hand. "Payment Recorded" is NOT here: only the Cashier can create it
// (paymentService.recordDocumentPayment), so nobody can skip the payment step.
const REVIEW_MOVES = { Submitted: ['Under Review', 'Rejected'], 'Under Review': ['Rejected'] }
const PROCESS_MOVES = {
  Submitted: ['Under Review', 'Rejected'],
  'Under Review': ['Approved', 'Rejected'],
  'Pending Payment': ['Rejected'],
  'Payment Recorded': ['Processing', 'Ready for Release'],
  Processing: ['Ready for Release'],
  'Ready for Release': ['Completed'],
}

// canProcess = the role has documents.process (Registrar). Reviewers (documents.review, Department) can only
// start a review or reject. The current status is always included so remarks can be edited on their own.
export const nextDocumentStatuses = (canProcess, status) => [status, ...((canProcess ? PROCESS_MOVES : REVIEW_MOVES)[status] ?? [])]

