# SSIS New Device Setup Guide

Set up the Laravel backend, React frontend and MySQL database on a new computer. Complete the initial setup once, then use the daily startup commands below.

## 1 Install the required software

Install PHP 8.3 or newer, Composer, Node.js with npm, and MySQL. Start MySQL before running database commands. Copy and extract the updated SSIS project on the new device.

Check the installed tools in a terminal:

```bash
php --version
composer --version
node --version
npm --version
```

## 2 Prepare the backend

Open a terminal in ssis_project/backend and install its dependencies:

```bash
composer install
```

For a new installation, create the backend environment file. Use ONE command for your terminal:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

If moving your existing database, copy the original backend .env instead. Keep its APP_KEY unchanged so existing encrypted credentials remain readable.

Edit backend/.env to match your MySQL account and local addresses:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ssis
DB_USERNAME=root
DB_PASSWORD=
STUDENT_LOGIN_URL=http://localhost:5173/student/login
```

A blank DB_PASSWORD is valid only when your MySQL account has no password. Keep SMTP settings in the backend .env if Registrar credential emails are required.

## 3 Create the MySQL database

Run this SQL in MySQL or phpMyAdmin:

```sql
CREATE DATABASE IF NOT EXISTS ssis
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

## 4 Initialize or restore the database

For a NEW installation with an EMPTY database, run these commands in the backend directory:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan optimize:clear
php artisan storage:link
php artisan ssis:sync-enrollment
php artisan serve --host=127.0.0.1 --port=8000
```

For an EXISTING database, restore its backup into MySQL and update the original .env connection settings. Run the following instead; do not regenerate APP_KEY or use migrate:fresh:

```bash
php artisan migrate
php artisan optimize:clear
php artisan storage:link
php artisan ssis:sync-enrollment
php artisan serve --host=127.0.0.1 --port=8000
```

Keep this terminal open. For a fresh database, configure the actual subject assignments before accepting students. Seeding does not create the institution’s complete subject catalog.

## 5 Start the frontend

Open a SECOND terminal in ssis_project/frontend. Preserve any existing frontend .env configuration when transferring the project.

```bash
npm install
npm run dev -- --host=127.0.0.1 --port=5173 --strictPort
```

Open http://localhost:5173 in your browser. Keep both backend and frontend terminals running. The strictPort option prevents Vite from silently switching to another port.

## 6 Daily startup after the initial setup

Start MySQL. Then open the two project terminals and run:

```bash
# Backend terminal in ssis_project/backend
php artisan serve --host=127.0.0.1 --port=8000
# Frontend terminal in ssis_project/frontend
npm run dev -- --host=127.0.0.1 --port=5173 --strictPort
```

You normally do not repeat dependency installation, key generation or database seeding for daily startup. Run php artisan migrate when an update adds migrations.

## Optional frontend checks

Run these in the frontend directory when testing or preparing a production build:

```bash
npm test
npm run build
```
