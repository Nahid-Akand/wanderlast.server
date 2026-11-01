# AGENTS.md

## Overview

Single-file Express API server (`index.js`) backed by MongoDB Atlas, plus a seed script (`seed.js`). No build step, no linting, no tests.

## Running

- Start: `node index.js` (there is no `start`/`dev` npm script; `npm test` is a placeholder that always fails).
- Seed fixtures: `node seed.js` — **destructive**: deletes every document in `destinations`, then inserts the 10 records defined in `seed.js`. Requires `MONGODB_URI`.
- The app is ESM (`"type": "module"` in package.json) — use `import`, not `require`.
- Port `5001` is **hardcoded** in `index.js`, not read from env.

## Environment & startup gotchas

- Requires `MONGODB_URI` **and** `BETTER_AUTH_SECRET` in `.env` (loaded via `import 'dotenv/config'`). The secret must match the Next.js frontend's (`../wanderlast/.env`) — it verifies better-auth JWTs against it. `.env` is gitignored but holds a real Atlas connection string — never print it, commit it, or move it elsewhere.
- MongoDB connects via top-level `await` at module load. If the connection fails, `connectToMongoDB()` returns `undefined` and the next line (`mongoClient.db(...)`) throws — a bad/missing `MONGODB_URI` crashes startup with an unhelpful TypeError, not a connection error.

## Auth

- `requireUser` middleware (in `index.js`) guards mutating routes. It reads `Authorization: Bearer <jwt>` — the better-auth cookie-cache JWT (`session_data`), which the frontend relays via its `/api/session-jwt` route. Verification: split `<header>.<payload>.<signature>`, HMAC-SHA256 over `<header>.<payload>` with `BETTER_AUTH_SECRET` (timing-safe, base64url), `exp` claim still future, then look up the session token embedded in the payload (`payload.session.token`) in the `session` collection (shared with the frontend's better-auth; `expiresAt > now`). Sets `req.userId` from the DB session; 401 JSON on any failure. The DB lookup keeps signout/revoke immediate — a valid unexpired JWT still401s once its session is deleted. Cookies are NOT accepted as credentials anymore.
- Currently applied to: `POST /add-destination`, all `/bookings` routes (POST/GET/PATCH/DELETE), `PATCH /destinations/:id`, `DELETE /destinations/:id`. GET `/destinations` remains public.
- `/bookings` routes derive `userId` from the session (`req.userId`) — the `userId` the frontend sends in the body/query is ignored, and PATCH/DELETE verify the booking belongs to the caller (404 otherwise).
- The frontend also calls a `/users` route that **doesn't exist here yet** — that 404s by design until implemented.
- CORS is `cors({ origin: 'http://localhost:3000', credentials: true })` — the preflight reflects the `authorization` request header; never change origin back to `*`.
- `POST /add-destination` adds `createdBy: req.userId` to the inserted doc.

## Data layer

- Database name is `wanderlast` (sic — note spelling differs from the repo name `wonderlast`); collections are `destinations` and `bookings`. better-auth (frontend) also uses this DB: `user`, `account`, `session` collections — the `session` collection is the source of truth for `requireUser`.
- Handlers write directly to collections with no validation layer: `POST /add-destination` inserts the body as-is, plus `createdBy: req.userId`.

## Known issues

- ~~`PATCH /destinations/:id` is broken~~ — fixed (was `$set: updatedDataata` typo) and now guarded with `ObjectId.isValid` + `requireUser`.
- Only `GET`/`DELETE /destinations/:id` guard with `ObjectId.isValid(id)`; ~~`PATCH` does not~~ PATCH now guards too.

## Conventions

- Existing routes use kebab-case (`/add-destination`, `/destinations`); follow that for new routes.
- Error handling in routes is minimal (`await` with no try/catch — an unhandled rejection in Express 5 returns a 500 automatically).
