# Reddit Clone

A faithful (dark-mode first) clone of the new reddit.com for a Web Development course project.
React 18 + Vite + Tailwind on the front, Node + Express REST API on the back, MongoDB (Atlas, through Mongoose) behind a repository layer.

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
Requirements: Node 20+ and a MongoDB Atlas cluster (free M0 is enough; it must be a replica set, which Atlas always is).

```bash
# 1) API
cd server
cp .env.example .env        # then edit it: set MONGODB_URI (see "Environment variables")
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
| `MONGODB_URI` | required | Atlas connection string (Atlas -> Connect -> Drivers) |
| `MONGODB_DB_NAME` | `reddit_clone` | database name inside the cluster |
| `AI_PROVIDER` | `mock` | `mock`, `gemini`, `openai`, `anthropic` |
| `AI_API_KEY` | empty | provider key (server only) |
| `AI_MODEL` | provider default | e.g. `gemini-flash-latest` |

## Scripts (`server/`)
| Command | What it does |
|---|---|
| `npm run dev` | API with auto-restart (watches `src/` only) |
| `npm run seed` | empties every collection (indexes are kept) and loads demo data |
| `npm test` | API + database tests; each test file uses its own temporary database, dropped at the end |
| `npm run test:votes` | fires 100 concurrent votes at MongoDB and asserts score = sum of votes, no duplicates |
| `npm run postman` | writes `docs/postman_collection.json` from the OpenAPI spec |

## Folder structure
```
server/src
  routes/        URL -> controller (+ validation, auth, rate limit)
  controllers/   HTTP <-> service translation only
  services/      all business rules (permissions, derived data, hydration)
  repositories/  the ONLY layer that touches storage
    index.js       exports the Mongo repositories    CONTRACT.md  the interface services rely on
    mongo/         MongoDB implementation
      connection.js  connect once, check replica set, build indexes, withTransaction()
      models.js      Mongoose schemas + every index (the ER diagram in code)
      record.js      _id -> id, Date -> ISO string (the contract shape)
      pagination.js  keyset cursor
      *Repo.js       one file per repository
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
- `repositories/mongo/voteRepo.js`: inside ONE transaction, upsert the vote row and get the previous one back, compute the delta, then update `score` (and the stored `hotScore`) in one atomic update. Concurrent votes on the same post cause a write conflict and MongoDB retries the loser with fresh data.
- `npm run test:votes` proves it: 100 concurrent mixed votes from 6 users, no duplicate vote rows, and the final score equals the sum of the stored votes.

## Database (MongoDB)
- **Collections:** `users`, `communities` (rules embedded), `community_members`, `posts`, `comments`, `votes`, `comment_votes`, `follows`, `chats` (members embedded with their `readAt`), `messages`, `notifications`, `saves`, `hides`, `reports`. Diagram and indexes: `docs/er-diagram.md`.
- **Ids** are strings (an ObjectId in hex), so the API contract stays the same and an unknown id is a 404, never a 500. **Dates** are stored as `Date` and returned to services as ISO strings.
- **Integrity:** unique indexes stop duplicates (case-insensitive email/username/community name, one membership, one vote, one follow/save/hide/report, one chat per member set). Transactions keep multi-write operations all-or-nothing: voting, deleting a post with its comments/votes, `commentCount`, `memberCount`, sending a message.
- **Feeds** use compound indexes `(filter, sortKey DESC, _id DESC)` and keyset pagination, so a page never repeats or skips posts. The "hot" score is stored (`hotScore`) so it can be sorted by an index.
- Indexes are created automatically when the server starts. Transactions need a replica set: the server refuses to start on a standalone `mongod` and says why.

## Chat (WebSocket)
Writes go over REST (`POST /chats/:id/messages`, validated and rate limited). The server then pushes `{ type: "chat.message", chatId, message }` to every member over `ws://host/ws`. The socket authenticates with the same httpOnly cookie and checks the `Origin` header. The client reconnects with exponential backoff and refetches after a reconnect.

## Uploads
`POST /uploads` (multipart, field `files`): JPG/PNG/GIF/WEBP up to 10 MB, MP4/WEBM/MOV up to 50 MB, max 10 files. Files are stored in `server/uploads` under random names, with the extension taken from the MIME type (not the client's file name). Posts store only the URLs.

## API documentation
- Swagger UI: `http://localhost:4000/api-docs` (raw spec: `/api-docs.json`)
- Postman: import `docs/postman_collection.json`, log in first (`POST /auth/login`), Postman keeps the cookie.

## Deployment (one server, no CORS)
1. `cd client && npm run build` creates `client/dist`.
2. On the host, run the API with `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-domain`, a real `JWT_SECRET`, `MONGODB_URI` and the AI variables. It serves the API, uploads, WebSocket **and** the built React app from one origin, so the cookie works without cross-site settings.
3. Start command: `cd server && npm install && npm start`. Hosts such as Render or Railway work. Use HTTPS (the cookie becomes `secure`).
4. Free hosts have ephemeral disks: `uploads/` is lost on redeploy (the data itself is safe in MongoDB Atlas). For a lasting deployment use a cloud bucket for uploads. Allow the host's IP (or 0.0.0.0/0) in Atlas Network Access.

## Known limitations
- Uploaded files live on local disk (single instance only).
- Chat has no typing indicator or read receipts per message.
- Uploaded files are not deleted when a post is deleted.