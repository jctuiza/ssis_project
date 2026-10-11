import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

const server = await createServer({
  configFile: false,
  root: frontendRoot,
  cacheDir: fileURLToPath(
    new URL('../node_modules/.vite-test-cache/', import.meta.url)
  ),
  server: {
    middlewareMode: true,
    hmr: false,
  },
  appType: 'custom',
})

try {
  const subjects = await server.ssrLoadModule(
    '/src/services/registrar/subjectService.js'
  )
  const grades = await server.ssrLoadModule(
    '/src/services/shared/gradeService.js'
  )

  await test(
    'API requests preserve program and department filters across both semesters',
    async () => {
      const original = globalThis.fetch
      const urls = []

      globalThis.fetch = async url => {
        urls.push(String(url))
        return {
          ok: true,
          json: async () => [],
        }
      }

      try {
        for (const [department_id, program] of [
          [1, 'BS Information Technology'],
          [2, 'BS Accountancy'],
        ]) {
          for (const semester of [
            'First Semester',
            'Second Semester',
          ]) {
            const filters = {
              department_id,
              program,
              year_level: '2',
              semester,
              academic_year: '2026-2027',
            }

            await subjects.getSubjects(filters)
            await grades.getAll(filters)

            for (const url of urls.slice(-2)) {
              const params = new URL(
                url,
                'http://localhost'
              ).searchParams

              for (const [key, value] of Object.entries(filters)) {
                assert.equal(params.get(key), String(value))
              }
            }
          }
        }

        assert.equal(urls.length, 8)

        await subjects.getSubjects()
        await grades.getAll()

        assert.equal(
          new URL(urls.at(-2), 'http://localhost').pathname,
          '/api/subjects'
        )
        assert.equal(
          new URL(urls.at(-1), 'http://localhost').pathname,
          '/api/grades'
        )
      } finally {
        globalThis.fetch = original
      }
    }
  )

  const { default: SessionProvider } =
    await server.ssrLoadModule('/src/context/SessionProvider.jsx')
  const { default: ToastProvider } =
    await server.ssrLoadModule('/src/context/ToastProvider.jsx')
  const { default: RegistrarEnrollment } =
    await server.ssrLoadModule(
      '/src/pages/registrar/RegistrarEnrollment.jsx'
    )

  await test(
    'registrar keeps application review without the secondary enrollment table',
    () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            SessionProvider,
            {
              user: { id: 'registrar', role: 'registrar' },
            },
            React.createElement(RegistrarEnrollment)
          )
        )
      )

      assert.match(html, /Online application/)
      assert.doesNotMatch(
        html,
        /Students confirm enrollment after|Enrolled on/
      )
      assert.match(html, /Existing student enrollment requests/)
      assert.equal((html.match(/<table/g) ?? []).length, 2)
    }
  )

  const { default: LoginForm } =
    await server.ssrLoadModule('/src/components/auth/LoginForm.jsx')

  for (const role of [
    'student',
    'admin',
    'registrar',
    'cashier',
    'department',
  ]) {
    await test(
      `${role} login keeps login fields and recovery instructions without demo credentials`,
      () => {
        const html = renderToStaticMarkup(
          React.createElement(
            MemoryRouter,
            null,
            React.createElement(LoginForm, {
              role,
              errors: {},
              identifier: '',
              password: '',
              onIdentifierChange: () => {},
              onPasswordChange: () => {},
            })
          )
        )

        assert.match(html, /autoComplete="username"/i)
        assert.match(html, /autoComplete="current-password"/i)
        assert.match(html, /Forgot password/)
        assert.doesNotMatch(
          html,
          /Demo:|student123|admin123|registrar123|cashier123|dept123/
        )
      }
    )
  }
} finally {
  await server.close()
}
