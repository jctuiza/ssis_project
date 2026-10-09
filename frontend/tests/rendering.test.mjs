import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
const server = await createServer({ root: new URL('../', import.meta.url).pathname, server: { middlewareMode: true }, appType: 'custom' })
try {
  const module = p => server.ssrLoadModule(`/src/${p}`)
  const { default: SessionProvider } = await module('context/SessionProvider.jsx')
  const { default: ToastProvider } = await module('context/ToastProvider.jsx')
  const { default: DataTable } = await module('components/tables/DataTable.jsx')
  const { default: SummaryCard } = await module('components/ui/SummaryCard.jsx')
  const { default: Skeleton } = await module('components/loading/Skeleton.jsx')
  await test('summary skeleton uses valid content inside paragraphs', () => {
    const html=renderToStaticMarkup(React.createElement(SummaryCard,{label:'Total students',value:React.createElement(Skeleton,{className:'h-8 w-24'})}))
    assert.match(html,/<span[^>]*aria-hidden="true"/)
    assert.doesNotMatch(html,/<p[^>]*>[^<]*<div/)
  })
  const { default: StaffDashboard } = await module('components/dashboard/StaffDashboard.jsx')
  const { default: StudentHome } = await module('pages/student/StudentHome.jsx')
  const { default: StudentEnrollment } = await module('pages/student/StudentEnrollment.jsx')
  const { default: StudentPayments } = await module('pages/student/StudentPayments.jsx')
  const { default: ResourcePage } = await module('components/dashboard/ResourcePage.jsx')
  const { navFor } = await module('config/navigation.js')
  const user = { id: '2026-0001', name: 'Alex', role: 'student', program: 'BS Information Technology', permissions: [] }
  const wrap = child => React.createElement(ToastProvider, null, React.createElement(SessionProvider, {user,navigate:()=>{},logout:()=>{},updateUser:()=>{}}, child))
  const { default: OnlineEnrollment } = await module('pages/auth/OnlineEnrollment.jsx')
  await test('online enrollment retains fields and campus background without tracking or credential controls', () => {
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(OnlineEnrollment)))
    for (const label of ['Last name', 'First name', 'Date of birth', 'Email address', 'Course to enroll', 'Submit application']) assert.ok(html.includes(label))
    assert.match(html, /campus\.webp/)
    assert.doesNotMatch(html, /Track your application|Access key|Retrieve login credentials|Check status/)
  })
  const { default: AcademicFilters } = await module('components/forms/AcademicFilters.jsx')
  await test('department filters omit department selector and retain program and year controls', () => {
    const staff={...user,role:'department',departmentId:1}
    const filters={departmentId:'1',program:'BS IT',departments:{data:[{id:1,code:'CCS',name:'Computing'}]},programs:['BS IT'],selectDepartment:()=>{},selectProgram:()=>{}}
    const html=renderToStaticMarkup(React.createElement(SessionProvider,{user:staff,navigate:()=>{},logout:()=>{},updateUser:()=>{}},React.createElement(AcademicFilters,{filters},React.createElement('label',null,'Year Level'))))
    assert.doesNotMatch(html,/Select department/);assert.match(html,/Course \/ Program/);assert.match(html,/Year Level/)
  })
  await test('table placeholders follow provided headers and page size', () => {
    const html=renderToStaticMarkup(React.createElement(DataTable,{columns:[{key:'name',label:'Applicant'},{key:'status',label:'Decision'}],loading:true,pageSize:3}))
    assert.match(html,/Applicant/); assert.match(html,/Decision/);assert.equal((html.match(/aria-hidden="true"/g) ?? []).length >=3,true)
    assert.equal((html.match(/<tr/g) ?? []).length,4)
  })
  await test('resource shell retains title, filters and real table headers before response', () => {
    const html=renderToStaticMarkup(wrap(React.createElement(ResourcePage,{title:'Applications',load:async()=>[],columns:[{key:'name',label:'Applicant'}],headerContent:React.createElement('div',null,'Department filter')})))
    assert.match(html,/Applications/);assert.match(html,/Department filter/);assert.match(html,/Applicant/);assert.match(html,/aria-busy="true"/)
  })
  await test('dashboard shows real labels and quick links while only values and bodies load', () => {
    const html=renderToStaticMarkup(wrap(React.createElement(StaffDashboard,{state:{loading:true,data:null},build:()=>({stats:[{label:'Pending applications',value:0}],links:[{label:'Review enrollment',page:'enrollment',icon:()=>null}],activities:[],panel:{title:'Latest applications',description:'Recent submissions',content:null}})})))
    assert.match(html,/Pending applications/);assert.match(html,/Review enrollment/);assert.match(html,/Latest applications/)
  })
  await test('student homepage immediately retains quick services and card headings', () => {
    const html=renderToStaticMarkup(wrap(React.createElement(StudentHome)))
    for(const label of ['Student information','Quick services','Recent transactions','Announcements']) assert.match(html,new RegExp(label))
    assert.match(html,/Document Requests/)
  })
  await test('student enrollment retains subjects table without enabling enrollment before response', () => {
    const html=renderToStaticMarkup(wrap(React.createElement(StudentEnrollment)))
    assert.match(html,/Enrollment information/);assert.match(html,/Course code/);assert.match(html,/Schedule/)
    assert.doesNotMatch(html,/>Enroll<\/button>/)
  })
  await test('student payments retains office instructions and transaction headers while loading', () => {
    const html=renderToStaticMarkup(wrap(React.createElement(StudentPayments)))
    assert.match(html,/Pay at the Cashier/);assert.match(html,/Payment history/);assert.match(html,/Balance after/)
  })
  await test('role menus move management to Department without removing registrar records', () => {
    const dept=navFor({role:'department',permissions:['grades.manage','subjects.manage','records.view']}).map(x=>x.key)
    const reg=navFor({role:'registrar',permissions:['enrollment.manage','students.view','records.view']}).map(x=>x.key)
    assert.ok(dept.includes('grades') && dept.includes('subjects'))
    assert.ok(!reg.includes('grades') && !reg.includes('subjects') && reg.includes('records') && reg.includes('enrollment'))
  })
} finally { await server.close() }
