# SSIS React frontend

React + Tailwind CSS frontend for the existing Laravel API. This refactor preserves portal URLs, services, role permissions, design, program filtering and page-specific loading skeletons. Login has no skeleton; restoring a session uses a blank screen.

## Setup

1. Replace the old frontend source with this folder rather than merging obsolete folders. Preserve your existing local `.env` values.
2. Run `npm ci`.
3. Start Laravel on port 8000, then run `npm run dev`.
4. Run `npm test` and `npm run build` for verification.

The Vite development proxy forwards `/api` to `http://localhost:8000`. Set `VITE_API_URL` in your deployment environment when Laravel uses another origin. Production must serve SPA routes through `index.html` (the existing Vercel rewrite is retained). Laravel continues to enforce authentication and permissions.

## Organization

- `api`: HTTP transport, token storage, API errors and request cache.
- `services`: Laravel endpoint calls grouped under auth, admin, student, cashier, registrar, department and shared; no rendered UI. Shared modules are imported across portals instead of duplicating API calls. paymentService is grouped with cashier but retains the existing read-only student account endpoints.
- `layouts`: the shared portal shell.
- `components`: reusable UI, forms, tables, feedback, loading and feature components.
- `pages`: route screens grouped by portal role; `shared` holds screens used across roles.
- `routes`: lazy portal screen selection; `App.jsx` keeps URL guards and session orchestration.
- `context`: shared state and React providers.
- `hooks`: reusable React behavior, including async action state.
- `config`, `utils`, `assets`, `styles`: configuration, pure helpers, images and global Tailwind styles.
- `tests`: optional development verification; not shipped to the browser.

Use PascalCase `.jsx` for components/providers that render JSX. Keep services, hooks, context declarations, configuration and pure utilities in `.js` when they contain no JSX. Do not rename every JavaScript file to JSX.

## Refactor details

Moved the HTTP implementation from `services/api.js` directly to `api/apiClient.js`, removed the duplicate re-export wrapper, and moved session infrastructure to `api/session.js`. Updated all relative imports. Moved DashboardLayout, ToastProvider and global styles to their dedicated folders. Grouped shared components into UI, forms, tables and feedback. Extracted duplicated admin async-action behavior into `useAction.js` and the session provider into `SessionProvider.jsx`. Removed unreferenced page barrels, skeleton components, the grading utility, the obsolete image manifest and empty App.css. Removed unused component imports.

All application source, the campus WebP, dependency lockfile and build configuration are included. Dependencies (`node_modules`) and generated output (`dist`) are intentionally excluded; install and build them locally. No backend code is changed.

## Portal service organization

All service imports have been updated for the nested folders. Services continue to use the same central API client, endpoints and authentication. Future shared functionality belongs in `services/shared`; role-specific endpoints belong in that role folder.
