# OptiBook Frontend

React 19 + Vite single-page application for the OptiBook scheduling system. See the project root [readme.md](../readme.md) for the full overview.

## Tech stack

- React 19
- Vite (dev server + build)
- Tailwind CSS v4
- Radix UI primitives (accessible Dialog, RadioGroup, Switch, etc.)
- axios (HTTP) + sonner (toasts)
- Chart.js (analytics charts)

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
npm run lint       # eslint
```

## Environment

Copy `.env.example` to `.env` and edit. Single variable:

- `VITE_API_URL` — base URL of the backend API (default `http://localhost:5000/api`)

## Folder map

```
src/
├── app/
│   ├── App.jsx                 # routing
│   └── components/
│       ├── admin/              # admin pages + layout
│       ├── optometrist/        # optometrist pages + layout
│       ├── patient/            # patient pages + booking + review modal
│       ├── common/             # shared diary / dashboard / waitlist components
│       └── ui/                 # Radix-based UI primitives
├── lib/                        # axios instance + per-feature API helpers
└── styles/                     # Tailwind base + globals
```

## Demo credentials

See the project root [readme.md](../readme.md#demo-credentials).
