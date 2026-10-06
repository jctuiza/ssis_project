# Free deployment: Vercel (front end) + Render (API) + a MySQL host

Write down the three addresses you get: the database host, the Render address and the Vercel address.

## 1. Database
Create a MySQL database on TiDB Cloud Starter (free, MySQL-compatible) or DigitalOcean Managed MySQL (paid, free with credits).
Note the host, port, username, password and database name. Nothing has to be imported by hand: Laravel creates the tables from
the migrations in `backend/database/migrations/`.

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
php artisan migrate --force

4. Deploy. The first start takes a few minutes. The free service sleeps after about 15 minutes without requests.

## 3. Front end on Vercel
1. vercel.com > Add New > Project > import the same repository.
2. **Root Directory: `frontend`**. Vercel detects Vite by itself (build `npm run build`, output `dist`).
3. Environment variable: `VITE_API_URL` = `https://YOUR-RENDER-ADDRESS.onrender.com/api`
4. Deploy, copy the Vercel address into Render as `FRONTEND_URL` (no trailing slash) and redeploy the API.
5. Open the Vercel address and log in at `/admin/login`.

Free plans change: check each site's pricing page before relying on them.
