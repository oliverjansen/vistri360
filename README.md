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
| Auth | Laravel Sanctum |
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
