#!/usr/bin/env bash
# Reorganizes the repository into backend/ (Laravel API) and frontend/ (React app). It only MOVES files (git mv keeps
# their history) and adds a few small config files; no application code is changed.
# Run it from the repository root in Git Bash:   bash restructure.sh
set -euo pipefail

[ -f artisan ] && [ -f composer.json ] || { echo "Run this from the repository root (the folder with artisan and composer.json)."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "This folder is not a git repository."; exit 1; }
if [ -n "$(git status --porcelain)" ]; then echo "Commit or stash your changes first (git status must be clean)."; exit 1; fi

git switch -c restructure
mkdir -p backend frontend docs

# Move a file or folder: git mv when git tracks it, plain mv for local-only things (.env, vendor, node_modules, new files).
move() {
  local src="$1" dst="$2"
  [ -e "$src" ] || return 0
  if git ls-files --error-unmatch -- "$src" >/dev/null 2>&1; then git mv "$src" "$dst"; else mv "$src" "$dst"; fi
}

echo "1/5 Backend (Laravel) ..."
for item in app bootstrap config database public routes storage tests resources artisan composer.json composer.lock phpunit.xml \
            .env.example .gitignore AGENTS.md CLAUDE.md boost.json Dockerfile .dockerignore docker .env vendor; do
  move "$item" backend/
done

echo "2/5 Frontend (React) ..."
move backend/resources/js/src frontend/src
rmdir backend/resources/js 2>/dev/null || true
for item in package.json package-lock.json .npmrc vite.config.js index.html vercel.json node_modules; do
  move "$item" frontend/
done
rm -f vite.vercel.config.js   # replaced by frontend/vite.config.js below

echo "3/5 Documents ..."
for item in API_SETUP.md INERTIA_SETUP.md; do move "$item" docs/; done
cat > docs/DEPLOY.md <<'EOF'
# Free deployment: Vercel (front end) + Render (API) + a MySQL host

Write down the three addresses you get: the database host, the Render address and the Vercel address.

## 1. Database
Create a MySQL database on TiDB Cloud Starter (free, MySQL-compatible) or DigitalOcean Managed MySQL (paid, free with credits).
Note the host, port, username, password and database name. Nothing has to be imported by hand: the API creates the tables from
`backend/database/ssis_db.sql` the first time it starts.

## 2. API on Render (Docker)
1. Push the repository to GitHub, then render.com > New > Web Service > pick the repository.
2. **Root Directory: `backend`**, Language: Docker, Instance type: Free.
3. Environment variables:

| Key | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | output of `php artisan key:generate --show` |
| `LOG_CHANNEL` | `stderr` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | from your database host |
| `MYSQL_ATTR_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` (TiDB needs an encrypted connection) |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION` | `file`, `file`, `sync` |
| `APP_TIMEZONE`, `DB_TIMEZONE` | `Asia/Manila`, `+08:00` |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first Admin account |
| `FRONTEND_URL` | the Vercel address (add it after step 3, then redeploy) |

4. Deploy. The first start takes a few minutes. The free service sleeps after about 15 minutes without requests.

## 3. Front end on Vercel
1. vercel.com > Add New > Project > import the same repository.
2. **Root Directory: `frontend`**. Vercel detects Vite by itself (build `npm run build`, output `dist`).
3. Environment variable: `VITE_API_URL` = `https://YOUR-RENDER-ADDRESS.onrender.com/api`
4. Deploy, copy the Vercel address into Render as `FRONTEND_URL` (no trailing slash) and redeploy the API.
5. Open the Vercel address and log in at `/admin/login`.

Free plans change: check each site's pricing page before relying on them.
EOF

# the old root-level deployment note is replaced by docs/DEPLOY.md
if [ -f DEPLOY.md ]; then git rm -qf DEPLOY.md 2>/dev/null || rm -f DEPLOY.md; fi

echo "4/5 New configuration files ..."
cat > frontend/vite.config.js <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Stand-alone React app (no Laravel plugin). In development, requests to /api are forwarded to the Laravel server
// (php artisan serve, port 8000), so the app can keep calling "/api". In production set VITE_API_URL instead (see .env.example).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
EOF
cat > frontend/index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎓</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Caveat:wght@500&display=swap"
      rel="stylesheet"
    />
    <title>Student Services Information System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
cat > frontend/vercel.json <<'EOF'
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
EOF
cat > frontend/.env.example <<'EOF'
# Address of the Laravel API when the front end is deployed on its own (for example on Vercel). Leave it commented out
# for local development: the dev server forwards /api to http://localhost:8000.
# VITE_API_URL=https://your-api.onrender.com/api
EOF
cat > frontend/.gitignore <<'EOF'
node_modules
dist
.env
.env.local
*.local
npm-debug.log*
EOF
cat > .gitignore <<'EOF'
# Each part has its own .gitignore (backend/.gitignore, frontend/.gitignore). These are repository-wide.
.DS_Store
Thumbs.db
.idea
.vscode
EOF
cat > README.md <<'EOF'
# Student Services Information System (SSIS)

A web system that replaces physical queueing for enrollment, clearance, grade viewing and document requests.
It has a Student portal and Registrar, Cashier, Department and Admin modules.

| Part | Folder | Technology |
|---|---|---|
| Front end (what users see) | [`frontend/`](frontend) | React, Tailwind CSS, Vite |
| Back end (REST API, business rules, security) | [`backend/`](backend) | Laravel (PHP) |
| Database | [`backend/database/ssis_db.sql`](backend/database/ssis_db.sql) | MySQL |
| Documents (deployment guide) | [`docs/`](docs) | |

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

## Run it on your computer

Requirements: PHP 8.3+, Composer, Node.js 20+, MySQL (for example XAMPP).

1. **Database:** start MySQL and import `backend/database/ssis_db.sql` (phpMyAdmin > Import).
2. **Back end** (terminal 1):
   ```
   cd backend
   composer install
   copy .env.example .env        (macOS/Linux: cp .env.example .env)
   php artisan key:generate
   php artisan migrate
   php artisan db:seed           (creates the Admin account from ADMIN_* in .env)
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
EOF

echo "5/5 Small fixes in backend/ ..."
if [ -f backend/composer.json ]; then
  # composer scripts that start npm no longer apply to the back end (npm now lives in frontend/).
  sed -i 's#"@php artisan migrate --force",#"@php artisan migrate --force"#' backend/composer.json
  sed -i '/"npm install --ignore-scripts",/d; /"npm run build"/d' backend/composer.json
  sed -i 's#"@php artisan dev"#"@php artisan serve"#' backend/composer.json
fi
for envfile in backend/.env.example backend/.env; do
  if [ -f "$envfile" ]; then
    grep -q '^FRONTEND_URL=' "$envfile" || printf '\n# Address of the React app (used by CORS when the front end runs on another address)\nFRONTEND_URL=http://localhost:5173\n' >> "$envfile"
  fi
done

echo
echo "Done. Check the result with:  git status"
echo "If it looks right:            git add -A && git commit -m \"Reorganize into backend/ and frontend/\""
echo "Then push the branch:         git push -u origin restructure"
echo "Remember to delete restructure.sh afterwards."
