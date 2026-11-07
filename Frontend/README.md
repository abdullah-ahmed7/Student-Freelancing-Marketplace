# StudentHub — Frontend

React 19 + Vite + React Router 7 + plain CSS (dark charcoal / mint theme, tokens in `src/index.css`).
Frontend only: the backend is owned by another teammate and is untouched.

## Setup
```bash
npm install
cp .env.example .env   # optional
npm run dev            # http://localhost:5173
npm run lint && npm run build
```

## Environment variables
| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCK` | `true` | Use the browser-local mock repository. Set `false` only once endpoints exist. |
| `VITE_API_BASE_URL` | empty | Base URL for the central client `src/services/apiClient.js`. |

## Mock mode (current)
All data goes through `src/services/*`, which read/write ONE mock repository (`services/mockDb.js`, seeded from `data/mockSeed.js`, kept in `localStorage`). It is demo-only and clearly labelled in the UI.
- Passwords are **never stored or checked** in mock mode. Demo accounts: `ali.hassan@lhr.nu.edu.pk`, `sara.ahmed@lhr.nu.edu.pk`, admin `admin@lhr.nu.edu.pk`. Verification demo code: `123456`.
- The mock enforces ownership, order transitions, review eligibility and "no ordering your own service" so the UI shows realistic errors. Real security must be enforced by the backend.
- To reset demo data, clear this site's localStorage.
- With `VITE_USE_MOCK=false` every service call fails with an explicit "not connected" error rather than guessing endpoints. See `FRONTEND_API_DEPENDENCIES.md`.

## Pages
Public: `/`, `/marketplace`, `/services/:id`, `/students`, `/students/:id`, `/login`, `/register`
Student: `/verify`, `/dashboard`, `/profile`, `/profile/edit`, `/portfolio`, `/my-services`, `/create-service`, `/services/:id/edit`, `/orders`, `/orders/:id`, `/saved`, `/notifications`
Admin: `/admin`, `/admin/users`, `/admin/categories`, `/admin/services`, `/admin/reviews`, `/admin/reports`
Plus a 404 page. Route guards are UI-level only.

## Structure
`components/` reusable UI · `layouts/` shell, navbar, footer · `pages/` routes · `context/` auth/toast/favorites · `hooks/` · `services/` data access (mock now, HTTP later) · `utils/` · `data/` mock seed only · `styles/` component CSS.

## Known limitations
- Backend/API not connected (contract unconfirmed); no real email OTP, file upload (images are URLs), payments, or Disputed order state.
- P2 items (seller analytics, description helper) not built.
- No automated test suite yet; verified by lint, build and a scripted browser walkthrough.
