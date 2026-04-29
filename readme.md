# OptiBook

An AI-augmented optical-clinic scheduling system, delivered as a UK Final Year Project (W1991885).

## Overview

OptiBook is a three-tier web application for independent optical clinics. It supports patient self-booking, optometrist clinical workflow, and admin oversight, with an explainable AI recommendation layer trained on synthetic data.

- **Frontend** — React 19 + Vite + Tailwind v4 + Radix UI
- **Backend** — Node 22 + Express + Mongoose 8
- **Database** — MongoDB Atlas
- **AI** — hand-written logistic regression no-show classifier (eleven features, no ML library dependencies)

## Features

| Area | Highlights |
|---|---|
| Patient | Self-registration, predictive + manual booking modes, post-appointment reviews, recall booking |
| Optometrist | Diary with no-show risk badges, start/complete with split eye-test / contact-lens recall, satisfaction KPI card |
| Admin | Clinic diary, ML monitoring dashboard, patient search by DOB, satisfaction column, read-only export tools |
| Recall split | Five-phase backward-compatible migration (R1–R5b) — eye-test and contact-lens recalls tracked independently |
| AI pipeline | Synthetic data → trained classifier → diary risk badges → admin model card → patient booking re-rank |
| Reviews | Five-question rating scale (1.0–5.0 in 0.5 steps), three-layer duplicate guard, satisfaction surfaces |

## Quick start

### Prerequisites
- Node 20+
- MongoDB (Atlas connection string or local)

### Setup

```bash
git clone <repository-url>
cd optibook

# Backend
cd backend
npm install
cp .env.example .env        # then edit values
npm run seed:demo           # creates demo users + appointments
npm run dev                 # starts on http://localhost:5000

# Frontend (in a second terminal)
cd ../frontend
npm install
cp .env.example .env        # default values usually work
npm run dev                 # starts on http://localhost:5173
```

### Seed scripts

| Command | Effect |
|---|---|
| `npm run seed:demo` | Clears collections, creates ~5 demo patients with appointments + waitlist |
| `npm run seed:synthetic` | **Adds** 50 deterministic synthetic patients (no clear, idempotent) |

## Demo credentials

All demo accounts use the same password: `password123`.

### Patient
- `sarah.j@email.com`
- `david.k@email.com`
- `ayesha.r@email.com`
- `liam.t@email.com`

### Optometrist (requires clinic gate)
- `emma.wilson@optibook.com`
- `james.chen@optibook.com`
- `sarah.miller@optibook.com`

### Admin (requires clinic gate)
- `admin@optibook.com`

### Clinic gate (staff only)
- Username: `optibook`
- Password: `changeme`

> **Replace clinic gate values before deploying.** They are committed only as defaults in `.env.example`.

## Folder map

```
optibook/
├── backend/                    # Express API
│   ├── src/
│   │   ├── controllers/        # route handlers
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # Express routers
│   │   ├── utils/              # AI scoring, recall migration, synthetic data
│   │   ├── scripts/            # offline scripts (e.g. trainNoShowModel)
│   │   └── server.js
│   └── README.md               # backend-specific notes
├── frontend/                   # React + Vite SPA
│   ├── src/app/components/     # feature folders (admin, optometrist, patient)
│   └── README.md               # frontend-specific notes
├── .env.example                # pointer to backend/.env.example + frontend/.env.example
└── readme.md                   # this file
```

## Environment variables

Real secrets are never committed. Copy the relevant `.env.example` and fill in values locally.

- **Backend** — see `backend/.env.example`
- **Frontend** — see `frontend/.env.example`

## Documentation

- `backend/README.md` — backend-specific quick start, API surface, seed details
- `frontend/README.md` — frontend-specific notes
- Dissertation scaffold (separate document) — full design / implementation / evaluation chapters

## Author

Waleed Imran · W1991885 · BSc (Hons) Computer Science · University of Westminster
