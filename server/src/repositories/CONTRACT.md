# Repository contract

All functions are async. Services import ONLY from `repositories/index.js`.
Records use string `id`s and ISO-8601 date strings. Return `null` when not found.

## userRepo
- create({ email, username, passwordHash }) -> User            unique: email, username (case-insensitive)
- findById(id) / findByIds(ids) / findByEmail(email) / findByUsername(username)
- usernameExists(username) -> boolean
- search(q, limit) -> User[]                                   prefix matches first
- updateById(id, { displayName, bio, avatarUrl }) -> User|null

## communityRepo
- create({ name, description, iconUrl, bannerUrl, creatorId }) -> Community   unique: name (case-insensitive)
- findById(id) / findByIds(ids) / findByName(name)
- list({ limit }) -> Community[]                               ordered by memberCount desc
- search(q, limit) -> Community[]
- addMember(communityId, userId, role = 'member')              unique (communityId, userId); increments memberCount
- removeMember(communityId, userId)                            decrements memberCount
- getMember(communityId, userId) -> { role }|null
- listModeratorIds(communityId) -> string[]
- listJoinedBy(userId) -> Community[]

## postRepo
- create({ communityId, authorId, type, title, body, mediaUrls, linkUrl }) -> Post
- findById(id) / findByIds(ids)
- update(id, { body?, mediaUrls?, type? }) -> Post|null        sets updatedAt (also invalidates the AI summary cache)
- deleteCascade(id)                                            removes the post, its comments and its votes (transaction in Mongo)
- sumScoreByAuthor(userId) -> number                           used for karma
- list({ communityIds?, authorId?, sort: 'hot'|'new'|'top', range, cursor, limit }) -> { items, nextCursor }
    Cursor is KEYSET based: opaque string encoding the last item's (sortKey, id).
    Mongo: sort by { sortKey: -1, _id: -1 } and filter { $or: [{ sortKey: { $lt: k } }, { sortKey: k, _id: { $lt: id } }] }.
    'hot' needs a stored hotScore field in Mongo (the mock computes it on the fly).

## commentRepo
- create({ postId, parentId, authorId, body }) -> Comment     increments post.commentCount
- findById(id), listByPost(postId), listByAuthor(authorId)
- update(id, { body }) -> Comment|null                         sets editedAt
- softDelete(id)                                               body='[deleted]', authorId=null, decrements post.commentCount (once)
- hasChildren(id) -> boolean
- remove(id)                                                   physical delete (no count change)

## voteRepo
- setVote(userId, postId, value in {1,-1,0}) -> { score, userVote } | null (post missing)
    MUST be atomic: transaction + unique index, see mongo/voteRepo.js.
- getUserVotes(userId, postIds) -> { [postId]: value }

## Storage: MongoDB (the only driver)
- Implementation: repositories/mongo/*.js, schemas + indexes in mongo/models.js, connection in mongo/connection.js.
- Configure MONGODB_URI (+ optional MONGODB_DB_NAME) in server/.env. The server needs a replica set (Atlas) for transactions.
- Unique indexes: users.email, users.username, communities.name (case-insensitive), community_members(communityId,userId),
  votes(userId,postId), comment_votes(userId,commentId), follows(followerId,followeeId), saves/hides/reports(userId,postId), chats.memberKey.
- The old in-memory/JSON mock driver was removed; every service reads and writes MongoDB.


## followRepo
- follow(followerId, followeeId)                 unique (followerId, followeeId); idempotent
- unfollow(followerId, followeeId)
- isFollowing(followerId, followeeId) -> boolean
- listFollowingIds(userId) / listFollowerIds(userId) -> string[]
- countFollowers(userId) / countFollowing(userId) -> number
- listFollowingOf(userIds) -> [{ followerId, followeeId }]      edges that start at any of the users

## chatRepo
- create({ participantIds, creatorId }) -> Chat
- findById(id) / findByParticipants(participantIds)             exact same member set
- listForUser(userId) -> Chat[]                                 newest activity first
- addMessage({ chatId, senderId, body }) -> Message             sets chat.lastMessageAt and the sender's readAt
- listMessages(chatId, { before, limit }) -> { items, hasMore } newest `limit` older than `before`, oldest first
- lastMessages(chatIds) -> { [chatId]: Message }
- markRead(chatId, userId)
- unreadCounts(userId) -> { [chatId]: number }                  messages from others newer than my readAt

Also: userRepo.listExcluding(ids, limit), communityRepo.listMemberships(communityIds),
postRepo.list({ ..., orAuthorIds })  (Mongo: { $or: [{ communityId: { $in } }, { authorId: { $in } }] }).


## commentVotes (voteRepo, same atomic design as posts)
- setCommentVote(userId, commentId, value in {1,-1,0}) -> { score, userVote } | null
- getUserCommentVotes(userId, commentIds) -> { [commentId]: value }
  Unique (userId, commentId). Removing a comment/post removes its votes.

## userPostRepo (per-user post state)
- setSaved(userId, postId, bool) / setHidden(userId, postId, bool)     unique (userId, postId) per list
- listSavedIds(userId) / listHiddenIds(userId) / savedAmong(userId, postIds) -> string[]
- report({ userId, postId, reason }) -> boolean (false if already reported) / listReportsFor(postIds)

## notificationRepo
- create({ userId, type, actorId, postId, commentId }) / listForUser(userId, limit) / countUnread(userId) / markAllRead(userId)

## Additions to existing repos
- postRepo.list({ ..., ids, excludeIds })     ids = only these posts (saved list), excludeIds = hidden/pinned
- postRepo.search(q, limit) / listPinned(communityId) / countPinned(communityId) / setPinned(id, bool) / isMediaUsed(url)
- commentRepo.sumScoreByAuthor(userId)        comment karma
- communityRepo.update(id, { description, iconUrl, bannerUrl, rules })