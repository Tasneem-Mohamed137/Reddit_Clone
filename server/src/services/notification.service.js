import { communityRepo, notificationRepo, postRepo, userRepo } from '../repositories/index.js';
import { publish } from '../realtime/hub.js';
import { toPublicUser } from './auth.service.js';

const PERSON_TYPES = new Set(['follow']); // notifications that are not about a post

export const notificationService = {
  // Called by other services when something happens. Nobody is notified about their own actions.
  async notify({ userId, type, actorId, postId = null, commentId = null }) {
    if (!userId || userId === actorId) return;
    await notificationRepo.create({ userId, type, actorId, postId, commentId });
    publish([userId], { type: 'notification' }); // the client refetches its counter
  },

  unreadCount(userId) {
    return notificationRepo.countUnread(userId);
  },

  async list(userId) {
    const rows = await notificationRepo.listForUser(userId, 50);
    const actors = new Map(
      (await userRepo.findByIds([...new Set(rows.map((n) => n.actorId))])).map((u) => [u.id, u]),
    );
    const posts = new Map(
      (await postRepo.findByIds([...new Set(rows.map((n) => n.postId).filter(Boolean))])).map((p) => [p.id, p]),
    );
    const communities = new Map(
      (await communityRepo.findByIds([...new Set([...posts.values()].map((p) => p.communityId))])).map((c) => [c.id, c]),
    );

    return rows
      // Hide notifications whose post was deleted in the meantime.
      .filter((n) => actors.has(n.actorId) && (PERSON_TYPES.has(n.type) || posts.has(n.postId)))
      .map((n) => {
        const post = posts.get(n.postId);
        return {
          id: n.id,
          type: n.type,
          read: Boolean(n.readAt),
          createdAt: n.createdAt,
          actor: toPublicUser(actors.get(n.actorId)),
          post: post ? { id: post.id, title: post.title, communityName: communities.get(post.communityId).name } : null,
        };
      });
  },

  markAllRead(userId) {
    return notificationRepo.markAllRead(userId);
  },
};