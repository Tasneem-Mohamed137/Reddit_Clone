# Delivery checklist

## Before you hand in
- [ ] `cd server && npm test` -> every test passes
- [ ] `npm run test:votes` -> `PASS: 100 concurrent votes ...` (the concurrency proof for the doctor)
- [ ] `npm run seed` then `npm run dev`: login `tasneem / Password123!` works
- [ ] `http://localhost:4000/api-docs` lists every endpoint (Auth, Users, Social, Communities, Posts, Post actions, Moderation, Voting, Comments, Uploads, Chat, Notifications, Search, AI)
- [ ] `npm run postman` -> `docs/postman_collection.json` exists; import it in Postman and try Login then Feed
- [ ] `docs/er-diagram.md` renders on GitHub (Mermaid)
- [ ] README: setup steps, env table, folder structure, how to swap the mock DB
- [ ] `server/.env.example` is complete and contains NO real key (the real `.env` is NOT committed)
- [ ] Root `.gitignore` contains: node_modules, .env, data.json, data.test.json, uploads, dist
- [ ] `client`: `npm run build` finishes without errors (and `npm run lint` if configured)
- [ ] No leftover files: `client/src/components/post/MediaPicker.jsx` was deleted

## Mongo
`DB_DRIVER=mongo` without a driver prints a clear message. To implement it: create
`server/src/repositories/mongo/index.js` exporting the same repos as `mock/index.js`
(see `repositories/CONTRACT.md`), create the unique indexes from `docs/er-diagram.md`, then set `DB_DRIVER=mongo`.

## What to demo
1. Register with the live username check, then log in/out
2. Create a community (upload icon + banner), join/leave, edit rules as the moderator
3. Create a post with the composer: markdown, image + video upload, tags, save a draft
4. Vote fast on a post (optimistic UI), refresh: the score is correct. Then run `npm run test:votes`
5. Nested comments, collapse, comment voting, "Top" sort, moderator "Remove" (and 403 for a normal user in Swagger)
6. Follow someone, "People you may know", Following feed
7. Chat between two browsers (normal + incognito), live message and unread badge
8. Notifications, search (posts/communities/people), AI Summarize