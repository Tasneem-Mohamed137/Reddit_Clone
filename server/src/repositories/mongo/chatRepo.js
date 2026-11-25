import { isDuplicateKey, withTransaction } from './connection.js';
import { Chat, Message } from './models.js';
import { toRecord, toRecords } from './record.js';

// The same set of people always produces the same key, whatever order the ids come in.
const memberKeyOf = (participantIds) => [...new Set(participantIds)].sort().join(',');

/**
 * Inside MongoDB a chat stores `members: [{ userId, readAt }]` (the ERD's CHAT_MEMBERS rows,
 * embedded). Services expect the mock's shape: `participantIds: [...]` and `readAt: { userId: time }`.
 * This function translates, so the services never see the storage layout.
 */
const toChat = (doc) => {
  if (!doc) return null;
  const { members, memberKey, ...rest } = doc;
  const chat = toRecord(rest);
  chat.participantIds = members.map((m) => m.userId);
  chat.readAt = Object.fromEntries(members.filter((m) => m.readAt).map((m) => [m.userId, m.readAt.toISOString()]));
  return chat;
};

export const chatRepo = {
  async create({ participantIds, creatorId }) {
    const memberKey = memberKeyOf(participantIds);
    try {
      const chat = await Chat.create({ memberKey, creatorId, members: participantIds.map((userId) => ({ userId })) });
      return toChat(chat.toObject());
    } catch (err) {
      // Two "open chat" requests raced: the unique memberKey kept only one, return that one.
      if (isDuplicateKey(err)) return toChat(await Chat.findOne({ memberKey }).lean());
      throw err;
    }
  },

  async findById(id) {
    return toChat(await Chat.findById(id).lean());
  },

  // Exact same set of people, so two users always share ONE 1:1 chat.
  async findByParticipants(participantIds) {
    return toChat(await Chat.findOne({ memberKey: memberKeyOf(participantIds) }).lean());
  },

  // 'members.userId' reaches INTO the embedded array (uses the multikey index).
  // A user has few chats, so sorting "last activity" in Node is fine.
  async listForUser(userId) {
    const chats = (await Chat.find({ 'members.userId': userId }).lean()).map(toChat);
    const activity = (c) => Date.parse(c.lastMessageAt ?? c.createdAt);
    return chats.sort((a, b) => activity(b) - activity(a));
  },

  // Insert the message, then move the chat's lastMessageAt and mark it read FOR THE SENDER.
  // 'members.$.readAt': `$` is the positional operator = "the array element the filter matched".
  async addMessage({ chatId, senderId, body }) {
    return withTransaction(async (session) => {
      const [message] = await Message.create([{ chatId, senderId, body }], { session });
      await Chat.updateOne(
        { _id: chatId, 'members.userId': senderId },
        { $set: { lastMessageAt: message.createdAt, 'members.$.readAt': message.createdAt } },
        { session },
      );
      return toRecord(message);
    });
  },

  // The newest `limit` messages older than `before`, returned oldest first (chat order).
  async listMessages(chatId, { before, limit = 30 }) {
    const filter = { chatId, ...(before ? { createdAt: { $lt: new Date(before) } } : {}) };
    const docs = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    return { items: toRecords(docs.slice(0, limit).reverse()), hasMore: docs.length > limit };
  },

  // Newest message of each chat in ONE aggregation: sort newest first, then take the $first per chat.
  async lastMessages(chatIds) {
    const rows = await Message.aggregate([
      { $match: { chatId: { $in: chatIds } } },
      { $sort: { chatId: 1, createdAt: -1, _id: -1 } },
      { $group: { _id: '$chatId', message: { $first: '$$ROOT' } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, toRecord(row.message)]));
  },

  async markRead(chatId, userId) {
    await Chat.updateOne({ _id: chatId, 'members.userId': userId }, { $set: { 'members.$.readAt': new Date() } });
  },

  // { [chatId]: number of messages from other people newer than my readAt }
  async unreadCounts(userId) {
    const chats = await Chat.find({ 'members.userId': userId }, { members: 1 }).lean();
    if (chats.length === 0) return {};
    const perChat = chats.map((c) => ({
      chatId: c._id,
      createdAt: { $gt: c.members.find((m) => m.userId === userId)?.readAt ?? new Date(0) },
    }));
    const rows = await Message.aggregate([
      { $match: { senderId: { $ne: userId }, $or: perChat } },
      { $group: { _id: '$chatId', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },
};
