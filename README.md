![Vistri 360 Logo](frontend/src/assets/logos/Vistri%20Logo_Horizontal.png)

<!-- # Vistri 360 -->

A full-stack web platform for 360° virtual tours, built with a React (Vite) frontend and a Laravel API backend.

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS v4 |
| 360° Viewer | Marzipano |
| Font | Plus Jakarta Sans |

### Backend

| Layer | Technology |
|---|---|
| Framework | Laravel 12 (PHP 8.2+) |
| Auth | Laravel Passport JWT (5-day access tokens) |
| Testing | PHPUnit |

### Deployment

Deployed on **Vercel** — the frontend is the root build target with SPA fallback routing.

---

## Project Structure

```
vistri360/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── assets/          # Static assets
│   │   │   ├── logos/       # Brand logos (example: Vistri Logo_Horizontal.png)
│   │   │   │   └── Vistri Logo_Horizontal.png
│   │   ├── components/
│   │   │   └── LandingComponents/   # NavBar, Footer, etc.
│   │   ├── hooks/           # Custom React hooks
│   │   ├── images/          # Image assets
│   │   ├── layouts/         # Route layout wrappers
│   │   │   ├── LandingLayout.jsx
│   │   │   ├── AuthLayout.jsx
│   │   │   └── DashLayout.jsx
│   │   ├── pages/
│   │   │   ├── LandingPages/ # Public-facing pages
│   │   │   ├── AuthPages/    # Sign-in, sign-up
│   │   │   └── DashboardPages/
│   │   ├── api/             # API service functions
│   │   ├── utils/           # Helpers & utilities
│   │   ├── App.jsx          # Router configuration
│   │   ├── main.jsx         # App entry point
│   │   └── index.css        # Global styles & design tokens
│   └── package.json
│
├── backend/                 # Laravel API
│   ├── app/
│   ├── routes/
│   ├── database/
│   ├── config/
│   └── composer.json
│
├── vercel.json              # Vercel deployment config
└── README.md
```

---

## Brand Colors

Defined as Tailwind v4 theme tokens in `frontend/src/index.css`:

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#3E92CC` | Primary accent (sky blue) |
| `secondary` | `#2A638F` | Secondary accent (steel blue) |
| `navy` | `#13293D` | Deep backgrounds, headings |
| `surface` | `#F1F0F0` | Light surface / card backgrounds |
| `black` | `#000000` | Text, borders |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PHP** ≥ 8.2 with Composer
- A database supported by Laravel (MySQL, PostgreSQL, SQLite)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173` by default.

### Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Runs at `http://localhost:8000` by default.

---

## Deployment checklist

Deploy the Laravel API and React frontend as separate applications. Do not expose the Laravel project root as a public directory; the backend web server must point to `backend/public`.

### Backend deployment

1. Provision PHP 8.2+ with the required extensions, including `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `tokenizer`, `xml`, and `ctype`. Install Composer on the server.

2. Configure `backend/.env` with production values:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
FRONTEND_URL=https://app.example.com

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_PORT=3306
DB_DATABASE=your-database
DB_USERNAME=your-database-user
DB_PASSWORD=your-database-password

FILESYSTEM_DISK=public
CACHE_STORE=database
QUEUE_CONNECTION=database
```

Never commit `.env`, OAuth keys, or database credentials.

3. Install production dependencies and generate the application key:

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
```

4. Run database migrations. This creates the application tables, Passport OAuth tables, roles, demo accounts, notifications, activity logs, and IP-ban storage:

```bash
php artisan migrate --force
```

5. Generate Passport keys on the server. Keep these files private and back them up securely so existing JWTs remain verifiable after redeployments:

```bash
php artisan passport:keys
php artisan passport:client --personal --provider=users --name="Vistri Web Personal Access Client"
```

If the personal client already exists, do not create a second one. The seeded development accounts are `admin@vistri.test` and `user@vistri.test`; change or remove them before production use.

6. Create the public storage link and cache configuration:

```bash
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

7. Run Laravel from a process manager and configure HTTPS. For production, use PHP-FPM plus Nginx/Apache, point the document root to `backend/public`, and run a queue worker if queued jobs are enabled:

```bash
php artisan queue:work --tries=3
```

The API uses Passport authentication, five-day access tokens, a 200-request-per-minute IP threshold, one-week IP bans, and admin security notifications. Monitor `storage/logs/laravel.log` and the `activity_logs` table.

### Frontend deployment

1. Set the production variables before building:

```dotenv
VITE_API_BASE_URL=https://api.example.com/api
VITE_STORAGE_PATH=https://api.example.com/storage
VITE_FRONTEND_URL=https://app.example.com
```

`VITE_*` values are compiled into the browser bundle, so do not put secrets in them.

2. Install dependencies and create the static build:

```bash
cd frontend
npm ci
npm run build
```

3. Deploy the generated `frontend/dist` directory to Vercel, Netlify, Cloudflare Pages, or another static host. Configure SPA fallback so every client-side route (`/auth/signin`, `/dashboard`, `/share/...`) serves `index.html`.

4. Add the deployed frontend origin to the backend `FRONTEND_URL` value and confirm CORS allows the frontend to call `/api/*`. Rebuild the frontend whenever `VITE_*` values change.

### Post-deployment smoke test

- Open `/auth/signin` and sign in with a production account.
- Confirm the browser receives a Passport bearer token and `/api/auth/me` succeeds.
- Create a client and project; verify entries appear in `activity_logs`.
- Confirm the notification icon loads `/api/notifications`.
- Open a public `/share/{token}` tour in an incognito window.
- Confirm panorama uploads resolve from the configured storage URL.
- Verify an unauthenticated request to a protected endpoint returns `401`.
- Verify HTTPS, database backups, Passport key backups, log rotation, and rate-limit monitoring are enabled.

---

## Available Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Backend

| Command | Description |
|---|---|
| `composer dev` | Start Laravel server, queue, and Vite concurrently |
| `composer test` | Run PHPUnit tests |
| `composer setup` | Full setup: install, migrate, build |

---

## Route Overview

| Path | Layout | Page |
|---|---|---|
| `/` | Landing | Home |
| `/auth/signin` | Auth | Sign In |
| `/dashboard` | Dashboard | Dashboard |

---

## License

Private — all rights reserved.
