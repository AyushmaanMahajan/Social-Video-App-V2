# Serendipity Stream

A single Next.js application that combines the previous React (Vite) frontend and Express backend into one codebase.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string
   - `JWT_SECRET` – Secret used to sign JWT auth tokens

3. **Database**

   Ensure PostgreSQL is running, then create the schema:

   ```bash
   npm run init-db
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – Start dev server (Next.js + Socket.io custom server)
- `npm run build` – Production build
- `npm run start` – Start production server
- `npm run init-db` – Initialize DB schema (run once after adding new tables)

## Project structure

- `src/app/` – Next.js App Router (layout, page, API routes)
- `src/app/api/` – API routes (auth, users, pool)
- `src/components/` – React UI components (client components, including VideoChat)
- `src/lib/` – Shared code (db, auth, api, webrtcConfig, useVideoSocket)
- `server.js` – Custom server (Next + Socket.io)
- `server/videoController.js` – Video call DB records (create/update attempts)
- `server/videoSocketHandler.js` – Socket.io `/video` namespace (signaling, mutual match, cleanup)
- `config/schema.sql` – DB schema (includes `video_calls` table)

## API routes (same as previous backend)

- `POST /api/auth/signup` – Register
- `POST /api/auth/login` – Login
- `GET /api/users/:userId` – Get user (auth required)
- `PUT /api/users/me` – Update current user (auth required)
- `GET /api/pool/profiles` – Browse profiles
- `POST /api/pool/add` – Add to pool
- `GET /api/pool/my-pool` – My pool
- `GET /api/pool/incoming` – Incoming
- `GET /api/pool/matches` – Mutual matches
- `GET /api/pool/mutual/:targetId` – Check mutual
- `POST /api/pool/report` – Report user

Auth: send `Authorization: Bearer <token>` for protected routes.

## Video calls (WebRTC)

- **Phase 1 (MVP):** Peer-to-peer over Socket.io signaling; Google STUN only; only mutual matches; call request / accept / reject / disconnect; `video_calls` table tracks attempts and status (`failed`, `connected`, `rejected`, `timeout`).
- **Phase 2:** TURN from env; reconnect; connection state UI; bandwidth adaptation; fallback messaging.

Video Chat UI: left = local + remote video (stacked), right = live text chat; Start / End; connection status. Dark mode default.

### Testing mode

Add `?videoTest=<mode>` to the URL on the Video Chat page:

- `ice_failure` – Simulate ICE connection failure (call ends immediately after connect attempt).
- `timeout` – Receiver never sees the incoming call; caller gets timeout after ~45s.
- `disconnect` – After connection, call auto-ends after 3s (simulate manual disconnect).
