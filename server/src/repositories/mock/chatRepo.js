import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';

const sameMembers = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

export const chatRepo = {
  async create({ participantIds, creatorId }) {
    const chat = {
      id: randomUUID(),
      participantIds,
      creatorId,
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
      readAt: {}, // userId -> ISO time of the last time that user read the chat
    };
    getDb().chats.push(chat);
    persist();
    return chat;
  },

  async findById(id) {
    return getDb().chats.find((c) => c.id === id) ?? null;
  },

  // Exact same set of people, so two users always share ONE 1:1 chat.
  async findByParticipants(participantIds) {
    return getDb().chats.find((c) => sameMembers(c.participantIds, participantIds)) ?? null;
  },

  async listForUser(userId) {
    return getDb()
      .chats.filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => Date.parse(b.lastMessageAt ?? b.createdAt) - Date.parse(a.lastMessageAt ?? a.createdAt));
  },

  async addMessage({ chatId, senderId, body }) {
    const db = getDb();
    const chat = db.chats.find((c) => c.id === chatId);
    const message = { id: randomUUID(), chatId, senderId, body, createdAt: new Date().toISOString() };
    db.messages.push(message);
    chat.lastMessageAt = message.createdAt;
    chat.readAt[senderId] = message.createdAt; // the sender has obviously read their own message
    persist();
    return message;
  },

  // The newest `limit` messages (oldest first) that are older than `before`.
  async listMessages(chatId, { before, limit = 30 }) {
    const all = getDb().messages.filter((m) => m.chatId === chatId && (!before || m.createdAt < before));
    return { items: all.slice(-limit), hasMore: all.length > limit };
  },

  // Messages are stored in send order, so the last one seen for a chat is its newest.
  async lastMessages(chatIds) {
    const wanted = new Set(chatIds);
    const result = {};
    for (const m of getDb().messages) if (wanted.has(m.chatId)) result[m.chatId] = m;
    return result;
  },

  async markRead(chatId, userId) {
    const chat = getDb().chats.find((c) => c.id === chatId);
    chat.readAt[userId] = new Date().toISOString();
    persist();
  },

  // { [chatId]: number of messages from other people newer than my last read }
  async unreadCounts(userId) {
    const db = getDb();
    const readAt = new Map(db.chats.filter((c) => c.participantIds.includes(userId)).map((c) => [c.id, c.readAt[userId] ?? '']));
    const counts = {};
    for (const m of db.messages) {
      const seen = readAt.get(m.chatId);
      if (seen !== undefined && m.senderId !== userId && m.createdAt > seen) counts[m.chatId] = (counts[m.chatId] ?? 0) + 1;
    }
    return counts;
  },
};