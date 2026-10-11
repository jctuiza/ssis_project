import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const module = path => server.ssrLoadModule(`/src/${path}`)
  const { cache } = await module('api/cache.js')
  const { tokenStore } = await module('api/session.js')
  const { default: SessionProvider } = await module('context/SessionProvider.jsx')
  const { default: ToastProvider } = await module('context/ToastProvider.jsx')
  const { default: StudentEnrollment } = await module('pages/student/StudentEnrollment.jsx')
  const { default: StudentGrades } = await module('pages/student/StudentGrades.jsx')
  const user = { id: 'test-student', role: 'student', program: 'BS IT', yearLevel: '2nd Year' }
  const render = () => renderToStaticMarkup(React.createElement(ToastProvider, null,
    React.createElement(SessionProvider, { user }, React.createElement(StudentEnrollment))))
  const data = {
    term: 'First Semester, A.Y. 2027-2028', enrollmentOpen: true, classification: 'Irregular', eligibleRequestTypes: ['Irregular'],
    enrollment: { status: 'Not Enrolled', assignmentMode: 'manual', program: 'BS IT', yearLevel: '2nd Year' },
    subjects: [], totalUnits: 0, pendingOffices: [], availableSubjects: [
      { code: 'RETAKE', name: 'Unfinished first-year subject', yearLevel: 1, units: 3, retake: true },
      { code: 'CURRENT', name: 'Second-year subject', yearLevel: 2, units: 3, retake: false },
    ],
  }
  const load = async value => {
    cache.clear()
    await cache.fetch(JSON.stringify([tokenStore.get(), 'pages/student/StudentEnrollment.jsx:1', [user.id]]), async () => value, true)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'student:enrollment-requests', []]), async () => [], true)
  }
  await test('irregular student sees current and retake offerings while pending staff review', async () => {
    await load({ ...data, reviewApproved: false, canSubmit: false })
    const html = render()
    for (const label of ['Irregular', '2nd Year', 'RETAKE', 'CURRENT', 'Outstanding / retake', 'Current level', 'Refresh enrollment']) assert.ok(html.includes(label))
    assert.match(html, /Registrar subject approval are required/)
    assert.doesNotMatch(html, />Enroll<\/button>/)
  })
  await test('unoffered failed subject remains visible after term changes', async () => {
    await load({ ...data, outstandingSubjects: [{code:'OLDFAIL',subject:'Prior failed subject',academicYear:'2026-2027',semester:'First Semester',status:'Failed'}] })
    const html = render()
    assert.match(html, /OLDFAIL/)
    assert.match(html, /Subject unavailable; contact Department/)
    assert.match(html, /Outstanding subjects to complete/)
  })
  await test('grades page retains the term dropdown without outstanding and year-level sections', async () => {
    await load(data)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'student:grades-standing', [user.id]]), async () => ({...data, outstandingSubjects:[{code:'OLDFAIL',subject:'Earlier subject',academicYear:'2026-2027',semester:'First Semester',finalGrade:50,status:'Failed'}]}), true)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'academic:settings', []]), async () => ({currentTerm:data.term}), true)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'pages/student/StudentGrades.jsx:1', [user.id]]), async () => [], true)
    const html = renderToStaticMarkup(React.createElement(ToastProvider,null,React.createElement(SessionProvider,{user},React.createElement(StudentGrades))))
    assert.doesNotMatch(html, /Outstanding subjects from previous terms/)
    assert.doesNotMatch(html, /Recorded year level/)
    assert.match(html, /id="grade-term"/)
  })
  await test('grades expose enrollment-year filters and distinguish retake history', async () => {
    await load(data)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'student:grades-standing', [user.id]]), async () => ({...data,outstandingSubjects:[]}), true)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'academic:settings', []]), async () => ({currentTerm:data.term}), true)
    await cache.fetch(JSON.stringify([tokenStore.get(), 'pages/student/StudentGrades.jsx:1', [user.id]]), async () => [
      {id:'old',academicYear:'2026-2027',semester:'First Semester',yearLevel:1,courses:[{code:'RETAKE',description:'Original',finalGrade:50,status:'Failed'}]},
      {id:'new',academicYear:'2027-2028',semester:'First Semester',yearLevel:2,courses:[{code:'RETAKE',description:'Retaken',finalGrade:60,status:'Passed',retake:true,previousAttempts:[{id:1,academicYear:'2026-2027',semester:'First Semester',finalGrade:50,status:'Failed'}]}]},
    ], true)
    const html = renderToStaticMarkup(React.createElement(ToastProvider,null,React.createElement(SessionProvider,{user},React.createElement(StudentGrades))))
    for(const label of ['Year 1','Year 2','Retake','Previous attempts','50.00','60.00']) assert.ok(html.includes(label),label)
  })
  await test('regular student cannot see or submit a special enrollment form', async () => {
    await load({...data,classification:'Regular',eligibleRequestTypes:[],enrollment:{...data.enrollment,assignmentMode:'automatic'}})
    const html = render()
    assert.doesNotMatch(html, /Irregular \/ returning enrollment/)
    assert.doesNotMatch(html, /Submit enrollment request/)
  })
  await test('irregular enrollment form offers only backend-approved request types', async () => {
    await load(data)
    const html = render()
    assert.match(html, /Submit enrollment request/)
    assert.match(html, /value="Irregular"/)
    assert.doesNotMatch(html, /value="Returning"/)
  })
  await test('staff approval exposes student confirmation rather than finalizing enrollment', async () => {
    await load({ ...data, reviewApproved: true, canSubmit: true, totalUnits: 6, subjects: data.availableSubjects })
    const html = render()
    assert.match(html, /Not Enrolled/)
    assert.match(html, />Enroll<\/button>/)
    assert.match(html, /Confirm enrollment below/)
  })
  await test('approved enrollment still shows pending clearance and hides the submit action', async () => {
    await load({ ...data, reviewApproved: true, canSubmit: false, pendingOffices: ['Cashier'] })
    const html = render()
    assert.match(html, /Complete clearance from: Cashier/)
    assert.doesNotMatch(html, />Enroll<\/button>/)
  })
} finally { await server.close() }
