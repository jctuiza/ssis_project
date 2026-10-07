// Field rules for the Registrar's "Register student" / "Edit student" form and the Admin's staff account forms.
// Used by the forms (inline messages under each field) and again by the services (the "backend" check).
// Each function returns an object { fieldKey: 'message' }. An empty object means the form is valid.
// Laravel: the same rules move into a FormRequest.
import { YEAR_LEVELS } from '../config/constants'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME = /^\p{L}[\p{L}\s.'-]*$/u
const PHONE_CHARS = /^[+\d\s()-]+$/
const USERNAME = /^[a-z0-9._-]+$/

// Shared by the forms, the services and the Profile page.
export const phoneIssue = (value) => {
  const digits = value.replace(/\D/g, '')
  if (!PHONE_CHARS.test(value) || digits.length < 7 || digits.length > 13) return 'Enter a valid contact number, for example 0917 555 0101.'
  return null
}

export function validateStudent(values, { requireDepartment = true } = {}) {
  const errors = {}
  const v = (key) => (typeof values[key] === 'string' ? values[key].trim() : values[key] ?? '')

  const name = v('name')
  if (!name) errors.name = "Enter the student's full name."
  else if (name.length < 2 || !NAME.test(name)) errors.name = 'Use letters, spaces, periods, apostrophes or hyphens only.'

  const email = v('email')
  if (!email) errors.email = 'Enter an email address.'
  else if (!EMAIL.test(email)) errors.email = 'Enter a valid email address, for example name@school.edu.'

  const contact = v('contact')
  if (!contact) errors.contact = 'Enter a contact number.'
  else if (phoneIssue(contact)) errors.contact = phoneIssue(contact)

  const birthdate = v('birthdate')
  if (!birthdate) errors.birthdate = 'Select the birthday.'
  else {
    const birth = new Date(`${birthdate}T00:00:00`)
    if (Number.isNaN(birth.getTime()) || birth.getFullYear() < 1900) errors.birthdate = 'Enter a valid birthday.'
    else if (birth > new Date()) errors.birthdate = 'The birthday cannot be in the future.'
  }

  const address = v('address')
  if (!address) errors.address = 'Enter the home address.'
  else if (address.length < 5) errors.address = 'The address is too short.'

  if (!v('program')) errors.program = 'Enter the program or course.'

  const yearLevel = v('yearLevel')
  if (!yearLevel) errors.yearLevel = 'Select a year level.'
  else if (!YEAR_LEVELS.includes(yearLevel)) errors.yearLevel = 'Select a valid year level.'

  if (requireDepartment && !v('departmentId')) errors.departmentId = 'Select a department.'

  // Optional, but must be valid when filled in.
  const emergencyContact = v('emergencyContact')
  if (emergencyContact && phoneIssue(emergencyContact)) errors.emergencyContact = phoneIssue(emergencyContact)
  if (v('emergencyName') && !NAME.test(v('emergencyName'))) errors.emergencyName = 'Use letters, spaces, periods, apostrophes or hyphens only.'

  return errors
}

// Admin: add / edit a staff account. `isNew` adds the fields that only exist when creating (username, role).
export function validateStaff(values, { isNew = true, requiresDepartment = false } = {}) {
  const errors = {}
  const v = (key) => (typeof values[key] === 'string' ? values[key].trim() : values[key] ?? '')

  const name = v('name')
  if (!name) errors.name = "Enter the staff member's full name."
  else if (name.length < 2 || !NAME.test(name)) errors.name = 'Use letters, spaces, periods, apostrophes or hyphens only.'

  if (isNew) {
    const username = v('username').toLowerCase()
    if (!username) errors.username = 'Enter a username.'
    else if (username.length < 3) errors.username = 'Use at least 3 characters.'
    else if (!USERNAME.test(username)) errors.username = 'Use letters, numbers, dots, dashes or underscores only.'
  }

  const email = v('email')
  if (!email) errors.email = 'Enter an email address.'
  else if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address.'

  // Optional, but must be valid when filled in.
  const contact = v('contact')
  if (contact && phoneIssue(contact)) errors.contact = phoneIssue(contact)

  if (isNew && !v('role')) errors.role = 'Select a role.'
  if (requiresDepartment && !v('departmentId')) errors.departmentId = 'Select a department.'

  return errors
}

// Profile page (every role). Staff may edit their own name; students may not (the Registrar manages it).
// Only the fields that are present in `values` are checked, so the same rules serve the form and the service.
export function validateProfile(values, { canEditName = false, requireContact = true } = {}) {
  const errors = {}
  const text = (key) => (typeof values[key] === 'string' ? values[key].trim() : '')

  if (canEditName && values.name !== undefined) {
    const name = text('name')
    if (!name) errors.name = 'Enter your full name.'
    else if (name.length < 2 || !NAME.test(name)) errors.name = 'Use letters, spaces, periods, apostrophes or hyphens only.'
  }

  if (values.email !== undefined) {
    const email = text('email')
    if (!email) errors.email = 'Enter an email address.'
    else if (!EMAIL.test(email)) errors.email = 'Enter a valid email address, for example name@school.edu.'
  }

  if (values.contact !== undefined) {
    const contact = text('contact')
    if (!contact && requireContact) errors.contact = 'Enter a contact number.'
    else if (contact && phoneIssue(contact)) errors.contact = phoneIssue(contact)
  }

  return errors
}


