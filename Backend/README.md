# Student Freelancing Marketplace – Backend

Node.js + Express + MongoDB (Mongoose), JWT auth.

## Setup
1. `cd Backend && npm install`
2. Copy `.env.example` to `.env` and fill in values (needs a running MongoDB or a MongoDB Atlas URI).
3. (Optional) `npm run seed` loads the 8 demo services from the frontend mock data.
4. `npm run dev` → API at http://localhost:5000

## Endpoints (all prefixed with /api)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | – | `{name,email,password,role,university}` (role: buyer, seller or both) |
| POST | /auth/login | – | `{email,password}` → `{token,user}` |
| GET/PUT | /auth/me | yes | Current user / update profile |
| GET | /services | – | Returns an array. Query: search, category, minPrice, maxPrice, sort (price_asc, price_desc, rating, newest) |
| GET | /services/:id | – | Single service |
| GET | /services/mine | seller/both | My listings |
| POST | /services | seller/both | Create listing |
| PUT/DELETE | /services/:id | seller (owner) | Edit / delete |
| POST | /orders | yes | `{serviceId, requirements}` |
| GET | /orders?as=seller | yes | My orders (buyer view by default) |
| GET | /orders/:id | yes | Order details |
| PATCH | /orders/:id/status | yes | `{status}`: seller → accepted/rejected/completed, buyer → cancelled |
| POST | /reviews | buyer | `{orderId, rating, comment}` (completed orders only) |
| GET | /reviews/service/:serviceId | – | Reviews of a service |

Send the token as `Authorization: Bearer <token>`.

## Frontend
`frontend-integration/api.js` is a ready-made fetch helper. Copy it to `Frontend/src/api/api.js` and use it in place of `serviceStorage.js`.
Service objects look like the frontend mock data: `{id, title, category, description, price, deliveryDays, seller (name string), sellerId}`.
