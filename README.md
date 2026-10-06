# Student Services Information System (SSIS)

A web system that replaces physical queueing for enrollment, clearance, grade viewing and document requests.
It has a Student portal and Registrar, Cashier, Department and Admin modules.


The two parts are independent: the front end talks to the back end only through the JSON API under `/api`, so each
one can be developed, tested and deployed separately (front end on Vercel, API on Render).

## Folder structure

```
ssis_project/
├── backend/                  Laravel API
│   ├── app/                  controllers (app/Http/Controllers), models, business rules (app/Support)
│   ├── routes/api.php        every API endpoint
│   ├── database/             migrations, seeders and ssis_db.sql (the database design)
│   ├── config/  tests/  ...  standard Laravel folders
│   └── composer.json, .env.example, Dockerfile
├── frontend/                 React app
│   ├── src/
│   │   ├── pages/            one folder per portal (student, registrar, cashier, department, admin, shared, auth)
│   │   ├── components/       reusable UI (layout, dashboard, forms, common)
│   │   ├── services/         calls to the API
│   │   ├── config/ utils/ hooks/ context/ routes/
│   │   └── main.jsx
│   ├── index.html, vite.config.js, package.json
└── docs/
```

## HOW TO RUN

Requirements: PHP 8.3+, Composer, Node.js 20+, MySQL (for example XAMPP).

1. **Database:** start MySQL(or XAMPP) and create an empty database named 'ssis' (or anything), then run php artisan migrate --seed on cmd.
2. **Back end** (terminal 1):
   ```
   cd backend
   composer install
   copy .env.example .env        (macOS/Linux: cp .env.example .env)
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve             (API at http://localhost:8000)
   ```
3. **Front end** (terminal 2):
   ```
   cd frontend
   npm install
   npm run dev                   (app at http://localhost:5173)
   ```
4. Open http://localhost:5173/admin/login. Staff log in at `/registrar/login`, `/cashier/login`, `/department/login`; students at `/student/login`.

## Deployment

- **Front end:** Vercel, Root Directory `frontend`, environment variable `VITE_API_URL`.
- **API:** Render (Docker), Root Directory `backend`.
- Step by step: [`docs/DEPLOY.md`](docs/DEPLOY.md).
