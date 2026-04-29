# OptiBook Backend API

Express + Mongoose API powering the OptiBook clinical scheduling system. See the project root [readme.md](../readme.md) for the full overview.

## Quick start

```bash
npm install
cp .env.example .env       # then fill in values (see below)
npm run seed:demo          # demo users + appointments
npm run dev                # http://localhost:5000
```

## Environment variables

Copy `.env.example` to `.env`. All variables are required:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas / local connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRE` | Token lifetime (e.g. `7d`) |
| `FRONTEND_URL` | Frontend origin allowed by CORS |
| `STAFF_GATE_USER` | Clinic-level keyword required for optom + admin login |
| `STAFF_GATE_PASS` | Clinic-level password required for optom + admin login |

> `JWT_SECRET` and `STAFF_GATE_*` should be replaced with strong values before any deployment. The `.env.example` placeholders are demo defaults only.

## Seed scripts

| Command | Effect |
|---|---|
| `npm run seed` | Minimal seed (4 users) |
| `npm run seed:demo` | **Clears** collections, creates rich demo data: ~5 patients + appointments + waitlist |
| `npm run seed:synthetic` | **Adds** 50 deterministic synthetic patients (no clear, idempotent, safe to re-run) |

The synthetic seed uses a fixed RNG seed (2026) so re-runs produce the same patient set. Each patient is created via the canonical `getNextPatientNumber()` so numbering stays consistent with the existing demo data.

## API surface (selected)

### Authentication
- `POST /api/auth/register` — patient self-registration
- `POST /api/auth/login` — patient login direct; staff login also requires the clinic gate
- `GET /api/auth/me` — current user + role profile

### Appointments
- `GET /api/appointments` — role-scoped list
- `POST /api/appointments` — create
- `GET /api/appointments/available` — slot availability for optom + date + type
- `PUT /api/appointments/:id/reschedule`
- `PUT /api/appointments/:id/cancel`

### Visit records
- `GET /api/visit-records/appointment/:id`
- `GET /api/visit-records/patient/:patientId`
- `PUT /api/visit-records/appointment/:id`
- `POST /api/visit-records/appointment/:id/complete` — accepts `eyeTestRecallMonths` and/or `contactLensRecallMonths`

### Reviews
- `POST /api/reviews` — patient creates review for own completed appointment (one per appointment)
- `GET /api/reviews/appointment/:id`
- `GET /api/reviews/optometrist/me/summary`
- `GET /api/reviews/optometrist/:id/summary`

### Analytics + AI insights
- `GET /api/analytics/dashboard`
- `GET /api/analytics/no-show-trends?days=N`
- `GET /api/analytics/ai-insights` — admin-only; includes trained model metadata + ML monitoring data
- `GET /api/analytics/high-risk-upcoming` — admin-only

### Settings, admin tools, notifications
- `GET / PUT /api/settings/reminder-templates` — reminder template editor
- `GET /api/admin/export | backup | report/:type` — admin-only data export
- `GET /api/notifications` + `PATCH /:id/read` + `POST /mark-all-read`

### Recalls + waitlist
- `GET /api/patients` — admin + optom; supports patient search use cases
- `GET /api/optometrists` — list (any authenticated user)
- `POST /api/waitlist/:id/book` — optom-side waitlist confirm

## Demo credentials

See the project root [readme.md](../readme.md#demo-credentials).
