import { test } from 'node:test'
import assert from 'node:assert/strict'
import { termKey, termView, gradeTermFor } from '../src/utils/academicTerm.js'
const oldTerm = 'First Semester, A.Y. 2026-2027'
const newTerm = 'First Semester, A.Y. 2027-2028'
test('semester aliases identify the same active term', () => {
  assert.equal(termKey(oldTerm), termKey('1st Semester, A.Y. 2026–2027'))
})
test('manual department filters reset when the authoritative term changes', () => {
  const selection = {sourceKey:termKey(oldTerm),year:'2025-2026',semester:'Second Semester'}
  assert.deepEqual(termView(oldTerm,selection), {year:'2025-2026',semester:'Second Semester'})
  assert.deepEqual(termView(newTerm,selection), {year:'2027-2028',semester:'First Semester'})
})
test('future student grade records do not become the active term', () => {
  const future = {id:'future',academicYear:'2027-2028',semester:'First Semester',courses:[{code:'FUTURE'}]}
  const selected = gradeTermFor([future],oldTerm,null,'BS IT')
  assert.equal(selected.academicYear,'2026-2027')
  assert.deepEqual(selected.courses,[])
  assert.equal(gradeTermFor([future],oldTerm,{sourceKey:termKey(oldTerm),id:'future'},'BS IT'),future)
})
test('student history selection resets after academic year activation', () => {
  const old = {id:'old',academicYear:'2026-2027',semester:'First Semester',courses:[]}
  const current = {id:'new',academicYear:'2027-2028',semester:'First Semester',courses:[]}
  assert.equal(gradeTermFor([old,current],newTerm,{sourceKey:termKey(oldTerm),id:'old'},'BS IT'),current)
})
