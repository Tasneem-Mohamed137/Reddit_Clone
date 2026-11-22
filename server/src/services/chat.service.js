import { z } from 'zod';
import { chatRepo, userRepo } from '../repositories/index.js';
import { publish } from '../realtime/hub.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser } from './auth.service.js';

export const createChatSchema = z.object({
  usernames: z.array(z.string().trim().min(1)).min(1).max(8),
});
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});
export const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(), // createdAt of the oldest message already loaded
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const toMessageDto = (m) => ({ id: m.id, chatId: m.chatId, senderId: m.senderId, body: m.body, createdAt: m.createdAt });

// Non-members get 404 (not 403), so nobody can probe which chat ids exist.
const findChatForMember = async (chatId, userId) => {
  const chat = await chatRepo.findById(chatId);
  if (!chat || !chat.participantIds.includes(userId)) throw AppError.notFound('Chat not found');
  return chat;
};

const hydrate = async (chats, viewerId) => {
  const users = new Map(
    (await userRepo.findByIds([...new Set(chats.flatMap((c) => c.participantIds))])).map((u) => [u.id, toPublicUser(u)]),
  );
  const lastMessages = await chatRepo.lastMessages(chats.map((c) => c.id));
  const unread = await chatRepo.unreadCounts(viewerId);

  return chats.map((chat) => ({
    id: chat.id,
    participants: chat.participantIds.map((id) => users.get(id)).filter(Boolean),
    isGroup: chat.participantIds.length > 2,
    lastMessage: lastMessages[chat.id] ? toMessageDto(lastMessages[chat.id]) : null,
    unreadCount: unread[chat.id] ?? 0,
    updatedAt: chat.lastMessageAt ?? chat.createdAt,
  }));
};

export const chatService = {
  // A chat nobody wrote in yet is only visible to the person who opened it.
  async list(userId) {
    const chats = (await chatRepo.listForUser(userId)).filter((c) => c.lastMessageAt || c.creatorId === userId);
    return hydrate(chats, userId);
  },

  // Opens the chat with these people, creating it if it does not exist yet.
  async open(userId, usernames) {
    const unique = [...new Set(usernames.map((name) => name.toLowerCase()))];
    const users = await Promise.all(unique.map((name) => userRepo.findByUsername(name)));
    const missing = unique.filter((_, i) => !users[i]);
    if (missing.length > 0) throw AppError.notFound(`User not found: ${missing.join(', ')}`);
    if (users.some((u) => u.id === userId)) throw AppError.badRequest('You cannot chat with yourself', 'CANNOT_CHAT_SELF');

    const participantIds = [userId, ...users.map((u) => u.id)];
    const chat =
      (await chatRepo.findByParticipants(participantIds)) ?? (await chatRepo.create({ participantIds, creatorId: userId }));
    return (await hydrate([chat], userId))[0];
  },

  // Newest page first; `nextBefore` is the cursor for the next (older) page, or null.
  async messages(userId, chatId, { before, limit }) {
    await findChatForMember(chatId, userId);
    const { items, hasMore } = await chatRepo.listMessages(chatId, { before, limit });
    return { items: items.map(toMessageDto), nextBefore: hasMore ? items[0].createdAt : null };
  },

  // Writes go over REST (validated, rate limited); the WebSocket only PUSHES the result to everyone in the chat.
  async send(userId, chatId, body) {
    const chat = await findChatForMember(chatId, userId);
    const message = toMessageDto(await chatRepo.addMessage({ chatId, senderId: userId, body }));
    publish(chat.participantIds, { type: 'chat.message', chatId, message });
    return message;
  },

  async markRead(userId, chatId) {
    await findChatForMember(chatId, userId);
    await chatRepo.markRead(chatId, userId);
  },
};