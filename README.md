# Reddit Clone

A faithful (dark-mode first) clone of the new reddit.com for a Web Development course project.
React 18 + Vite + Tailwind on the front, Node + Express REST API on the back, swappable database layer.

## Features
- **Accounts:** register with live username check, login/logout (JWT in an httpOnly cookie), profile edit with avatar upload
- **Communities:** create (icon/banner upload), join/leave, moderators, "About community"
- **Posts:** one Reddit-style composer (title, tags, markdown body, photos/videos, link), drafts, edit, delete, NSFW/Spoiler tags
- **Feed:** For You / Following (joined communities + followed people), Best / New / Top (+ time range), card/compact view, cursor-based infinite scroll
- **Voting:** one vote per user per post, atomic and idempotent, optimistic UI with rollback
- **Comments:** unlimited nesting, collapse threads, "load more replies" past depth 8, markdown, `[deleted]` keeps children
- **Moderation:** moderators can remove any post/comment of their community (enforced on the server, 403 otherwise)
- **Social:** follow users, "People you may know", find people
- **Chat:** 1:1 and group chats in real time (WebSocket), unread badges
- **Search:** communities and people, with autocomplete in the navbar
- **AI Summarize:** Gemini / OpenAI / Anthropic (key stays on the server), mock summary when no key, cached and rate limited
- **UI:** dark/light theme, RTL-aware titles, skeleton loaders, toasts, responsive, hover-peek sidebar

## Quick start
Requirements: Node 20+.

```bash
# 1) API
cd server
cp .env.example .env        # then edit it (see "Environment variables")
npm install
npm run seed                # demo data. Login: tasneem / Password123!
npm run dev                 # http://localhost:4000  (docs: /api-docs)

# 2) Web app (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```
Vite proxies `/api`, `/uploads` and `/ws` to the API, so the browser only talks to one origin.

## Environment variables (`server/.env`)
| Name | Default | Meaning |
|---|---|---|
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | `production` also serves `client/dist` |
| `CLIENT_ORIGIN` | `http://localhost:5173` | allowed CORS / WebSocket origin |
| `JWT_SECRET` | required | long random string |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `DB_DRIVER` | `mock` | `mock` (JSON file) or `mongo` |
| `AI_PROVIDER` | `mock` | `mock`, `gemini`, `openai`, `anthropic` |
| `AI_API_KEY` | empty | provider key (server only) |
| `AI_MODEL` | provider default | e.g. `gemini-flash-latest` |

## Scripts (`server/`)
| Command | What it does |
|---|---|
| `npm run dev` | API with auto-restart (watches `src/` only) |
| `npm run seed` | resets `data.json` and loads demo data |
| `npm run test:votes` | fires 100 concurrent votes and asserts the final score |
| `npm run postman` | writes `docs/postman_collection.json` from the OpenAPI spec |

## Folder structure
```
server/src
  routes/        URL -> controller (+ validation, auth, rate limit)
  controllers/   HTTP <-> service translation only
  services/      all business rules (permissions, derived data, hydration)
  repositories/  the ONLY layer that touches storage
    index.js       DB_DRIVER switch        CONTRACT.md  interface to implement
    mock/          JSON-file implementation (+ per-post mutex for votes)
  middleware/    auth, validate, rateLimit, upload, errorHandler
  realtime/      WebSocket hub (chat push)
  docs/          OpenAPI spec (served at /api-docs)
client/src
  pages/ components/ hooks/ context/ api/ utils/
docs/            ER diagram, Postman collection
```
Request flow: `route -> controller -> service -> repository`. Errors are thrown as `AppError` and formatted once as `{ "error": { "code", "message" } }`.

## Voting and concurrency
- Votes are a separate collection with a **unique key (userId, postId)**.
- `PUT /posts/:id/vote { value: 1 | -1 | 0 }` is idempotent. The score changes by `delta = newValue - oldValue`, applied atomically (`$inc` / `SET score = score + delta`), never read-modify-write in application code.
- The mock repository serialises votes with a per-post async queue. `repositories/mock/voteRepo.js` documents the exact MongoDB translation: unique compound index + `findOneAndUpdate` (upsert, `returnDocument: 'before'`) + `$inc` inside one transaction.
- `npm run test:votes` proves it: 100 concurrent mixed votes from 6 users, final score must equal the sum of each user's last vote.

## Swapping the mock DB for MongoDB
1. Create `server/src/repositories/mongo/` with the same exports as `mock/index.js` (`userRepo`, `communityRepo`, `postRepo`, `commentRepo`, `voteRepo`, `followRepo`, `chatRepo`). `repositories/CONTRACT.md` lists every function, its return shape and the indexes.
2. Create the unique indexes from `docs/er-diagram.md`.
3. Set `DB_DRIVER=mongo` (plus your connection string). No service, controller or route changes.

## Chat (WebSocket)
Writes go over REST (`POST /chats/:id/messages`, validated and rate limited). The server then pushes `{ type: "chat.message", chatId, message }` to every member over `ws://host/ws`. The socket authenticates with the same httpOnly cookie and checks the `Origin` header. The client reconnects with exponential backoff and refetches after a reconnect.

## Uploads
`POST /uploads` (multipart, field `files`): JPG/PNG/GIF/WEBP up to 10 MB, MP4/WEBM/MOV up to 50 MB, max 10 files. Files are stored in `server/uploads` under random names, with the extension taken from the MIME type (not the client's file name). Posts store only the URLs.

## API documentation
- Swagger UI: `http://localhost:4000/api-docs` (raw spec: `/api-docs.json`)
- Postman: import `docs/postman_collection.json`, log in first (`POST /auth/login`), Postman keeps the cookie.

## Deployment (one server, no CORS)
1. `cd client && npm run build` creates `client/dist`.
2. On the host, run the API with `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-domain`, a real `JWT_SECRET` and the AI variables. It serves the API, uploads, WebSocket **and** the built React app from one origin, so the cookie works without cross-site settings.
3. Start command: `cd server && npm install && npm start`. Hosts such as Render or Railway work. Use HTTPS (the cookie becomes `secure`).
4. Free hosts have ephemeral disks: `data.json` and `uploads/` are lost on redeploy. For a lasting deployment use the Mongo driver and a cloud bucket for uploads.

## Known limitations
- Mock database and uploads live on local disk (single instance only).
- Chat has no typing indicator or read receipts per message.
- Uploaded files are not deleted when a post is deleted.