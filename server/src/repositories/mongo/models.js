import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * IDs: the API contract (repositories/CONTRACT.md) and the frontend use STRING ids, so `_id` is a
 * String holding a fresh ObjectId in hex. We get:
 *  - the same string ids the mock had, so no service/frontend change;
 *  - ids that grow with creation time inside one server process, which breaks ties in sorting
 *    (two messages created in the same millisecond still come back in send order);
 *  - no CastError (HTTP 500) when someone requests /posts/not-a-real-id: it is simply "not found".
 */
export const newId = () => new mongoose.Types.ObjectId().toHexString();
const id = { type: String, default: newId };
const ref = (modelName, required = true) => ({ type: String, ref: modelName, required, default: required ? undefined : null });

// Case-insensitive comparison ("Omar" == "omar") for unique usernames, emails and community names.
// strength 2 = ignore case, but not accents. Queries must pass the SAME collation to use the index.
export const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

// versionKey:false drops the `__v` field; we never rely on Mongoose's optimistic versioning
// because every concurrent update here is an atomic operator ($inc, $set) or a transaction.
const options = { versionKey: false };

/* ------------------------------------------------------------------ USERS */
const userSchema = new Schema(
  {
    _id: id,
    email: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: null },
    karma: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  options,
);
userSchema.index({ email: 1 }, { unique: true, collation: CASE_INSENSITIVE });
userSchema.index({ username: 1 }, { unique: true, collation: CASE_INSENSITIVE });
userSchema.index({ createdAt: -1, _id: -1 }); // "people you may know" fills with newest members
export const User = model('User', userSchema, 'users');

/* ------------------------------------------------------------ COMMUNITIES */
// Rules are always read and written together with their community and there are at most 10,
// so they are EMBEDDED (an array inside the community document) instead of their own collection.
const ruleSchema = new Schema({ title: String, description: { type: String, default: '' } }, { _id: false });

const communitySchema = new Schema(
  {
    _id: id,
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: null },
    bannerUrl: { type: String, default: null },
    creatorId: ref('User'),
    memberCount: { type: Number, default: 0, min: 0 }, // changed only by $inc together with community_members
    rules: { type: [ruleSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  options,
);
communitySchema.index({ name: 1 }, { unique: true, collation: CASE_INSENSITIVE }); // r/name URLs are unique
communitySchema.index({ memberCount: -1 }); // popular communities list
export const Community = model('Community', communitySchema, 'communities');

/* ------------------------------------------------------ COMMUNITY_MEMBERS */
// Many-to-many users <-> communities. A separate collection (not an array in the community)
// because a community can have an unbounded number of members; MongoDB documents max out at 16 MB.
const memberSchema = new Schema(
  {
    _id: id,
    communityId: ref('Community'),
    userId: ref('User'),
    role: { type: String, enum: ['member', 'moderator'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  options,
);
memberSchema.index({ communityId: 1, userId: 1 }, { unique: true }); // joining twice is impossible
memberSchema.index({ userId: 1 }); // "my communities"
memberSchema.index({ communityId: 1, role: 1 }); // list moderators
export const CommunityMember = model('CommunityMember', memberSchema, 'community_members');

/* ------------------------------------------------------------------ POSTS */
const postSchema = new Schema(
  {
    _id: id,
    communityId: ref('Community'),
    authorId: ref('User'),
    type: { type: String, enum: ['text', 'image', 'link'], default: 'text' }, // derived by the service
    title: { type: String, required: true },
    body: { type: String, default: '' },
    mediaUrls: { type: [String], default: [] },
    linkUrl: { type: String, default: null },
    tags: { type: [{ type: String, enum: ['nsfw', 'spoiler'] }], default: [] },
    pinned: { type: Boolean, default: false },
    score: { type: Number, default: 0 }, // ONLY changed by an atomic delta in voteRepo
    hotScore: { type: Number, required: true }, // stored so the "hot" feed can be sorted by an index
    commentCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  options,
);
// Every feed is "filter, then sort by <key> DESC, _id DESC". One index per (filter, key) pair
// lets MongoDB walk the index in order and stop after `limit` documents (no in-memory sort).
postSchema.index({ communityId: 1, createdAt: -1, _id: -1 }); // community feed, New
postSchema.index({ communityId: 1, hotScore: -1, _id: -1 }); // community feed, Hot/Best
postSchema.index({ communityId: 1, score: -1, _id: -1 }); // community feed, Top
postSchema.index({ createdAt: -1, _id: -1 }); // r/all New
postSchema.index({ hotScore: -1, _id: -1 }); // r/all Hot
postSchema.index({ score: -1, _id: -1 }); // r/all Top
postSchema.index({ authorId: 1, createdAt: -1 }); // profile Posts tab, Following feed, karma
postSchema.index({ communityId: 1, pinned: 1 }, { partialFilterExpression: { pinned: true } }); // only pinned posts are indexed
postSchema.index({ mediaUrls: 1 }); // multikey: "is this uploaded file still used?"
export const Post = model('Post', postSchema, 'posts');

/* --------------------------------------------------------------- COMMENTS */
// Comments reference their post and their parent comment (self relation). Not embedded in the
// post: threads are unbounded and comments are edited/voted/deleted individually.
const commentSchema = new Schema(
  {
    _id: id,
    postId: ref('Post'),
    parentId: ref('Comment', false), // null = top level
    authorId: ref('User', false), // null once deleted
    body: { type: String, required: true },
    deleted: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date, default: null },
  },
  options,
);
commentSchema.index({ postId: 1, parentId: 1 }); // load a thread
commentSchema.index({ parentId: 1 }); // "does this comment have replies?"
commentSchema.index({ authorId: 1 }); // profile Comments tab, comment karma
export const Comment = model('Comment', commentSchema, 'comments');

/* ---------------------------------------------------- VOTES / COMMENT_VOTES */
const voteSchema = (targetField, targetModel) => {
  const schema = new Schema(
    {
      _id: id,
      userId: ref('User'),
      [targetField]: ref(targetModel),
      value: { type: Number, enum: [1, -1], required: true }, // "no vote" = no document
    },
    options,
  );
  // THE integrity rule: at most one vote per user per target, even when requests race.
  schema.index({ userId: 1, [targetField]: 1 }, { unique: true });
  schema.index({ [targetField]: 1 }); // delete all votes of a post/comment
  return schema;
};
export const Vote = model('Vote', voteSchema('postId', 'Post'), 'votes');
export const CommentVote = model('CommentVote', voteSchema('commentId', 'Comment'), 'comment_votes');

/* ---------------------------------------------------------------- FOLLOWS */
const followSchema = new Schema(
  {
    _id: id,
    followerId: ref('User'),
    followeeId: ref('User'),
    createdAt: { type: Date, default: Date.now },
  },
  options,
);
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true }); // follow is idempotent
followSchema.index({ followeeId: 1 }); // followers list / count
export const Follow = model('Follow', followSchema, 'follows');

/* ------------------------------------------------- CHATS (+ CHAT_MEMBERS) */
// The ERD's CHAT_MEMBERS rows are EMBEDDED in the chat as `members`: a chat has a handful of
// members, they are always needed together with the chat, and readAt is updated in place with
// the positional operator ($). Messages are NOT embedded: they grow without limit.
const chatMemberSchema = new Schema(
  { userId: ref('User'), readAt: { type: Date, default: null } },
  { _id: false },
);
const chatSchema = new Schema(
  {
    _id: id,
    // Sorted member ids joined with ",". Unique, so the same group of people always shares ONE chat,
    // even if two "open chat" requests race. Also makes "find chat by exact member set" one lookup.
    memberKey: { type: String, required: true },
    members: { type: [chatMemberSchema], validate: (v) => v.length >= 2 },
    creatorId: ref('User'),
    createdAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: null },
  },
  options,
);
chatSchema.index({ memberKey: 1 }, { unique: true });
chatSchema.index({ 'members.userId': 1 }); // multikey: "my chats"
export const Chat = model('Chat', chatSchema, 'chats');

const messageSchema = new Schema(
  {
    _id: id,
    chatId: ref('Chat'),
    senderId: ref('User'),
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  options,
);
messageSchema.index({ chatId: 1, createdAt: -1, _id: -1 }); // latest messages, page back in time
export const Message = model('Message', messageSchema, 'messages');

/* ---------------------------------------------------------- NOTIFICATIONS */
const notificationSchema = new Schema(
  {
    _id: id,
    userId: ref('User'), // receiver
    type: { type: String, required: true },
    actorId: ref('User'), // who caused it
    postId: ref('Post', false),
    commentId: ref('Comment', false),
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
  },
  options,
);
notificationSchema.index({ userId: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ userId: 1, readAt: 1 }); // unread count
export const Notification = model('Notification', notificationSchema, 'notifications');

/* ------------------------------------------- SAVES / HIDES / REPORTS (user x post) */
const userPostSchema = (extra = {}) => {
  const schema = new Schema(
    { _id: id, userId: ref('User'), postId: ref('Post'), ...extra, createdAt: { type: Date, default: Date.now } },
    options,
  );
  schema.index({ userId: 1, postId: 1 }, { unique: true }); // save/hide/report once
  schema.index({ postId: 1 }); // cascade delete, reports of a post
  return schema;
};
export const Save = model('Save', userPostSchema(), 'saves');
export const Hide = model('Hide', userPostSchema(), 'hides');
export const Report = model('Report', userPostSchema({ reason: { type: String, default: '' } }), 'reports');

export const allModels = [
  User, Community, CommunityMember, Post, Comment, Vote, CommentVote, Follow, Chat, Message, Notification, Save, Hide, Report,
];
