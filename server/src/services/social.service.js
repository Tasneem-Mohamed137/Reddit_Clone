import { z } from 'zod';
import { communityRepo, followRepo, userRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser } from './auth.service.js';
import { notificationService } from './notification.service.js';

export const suggestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(8),
});

const findUserOrThrow = async (username) => {
  const user = await userRepo.findByUsername(username);
  if (!user) throw AppError.notFound('User not found');
  return user;
};

const followState = async (viewerId, targetId) => ({
  isFollowing: await followRepo.isFollowing(viewerId, targetId),
  followerCount: await followRepo.countFollowers(targetId),
});

export const socialService = {
 async follow(viewerId, username) {
    const target = await findUserOrThrow(username);
    if (target.id === viewerId) throw AppError.badRequest('You cannot follow yourself', 'CANNOT_FOLLOW_SELF');
    const alreadyFollowing = await followRepo.isFollowing(viewerId, target.id);
    await followRepo.follow(viewerId, target.id); // idempotent
    // Only the first follow notifies, so pressing Follow repeatedly cannot spam someone.
    if (!alreadyFollowing) await notificationService.notify({ userId: target.id, type: 'follow', actorId: viewerId });
    return followState(viewerId, target.id);
  },

  async unfollow(viewerId, username) {
    const target = await findUserOrThrow(username);
    await followRepo.unfollow(viewerId, target.id);
    return followState(viewerId, target.id);
  },

  // kind = 'following' (people I follow) or 'followers' (people who follow me)
  async listConnections(userId, kind) {
    const ids = kind === 'following' ? await followRepo.listFollowingIds(userId) : await followRepo.listFollowerIds(userId);
    const users = await userRepo.findByIds(ids);
    return users.sort((a, b) => a.username.localeCompare(b.username)).map(toPublicUser);
  },

  // "People you may know". Ranked by two signals, then filled with the newest members:
  //   1. people followed by the people I follow (weight 3 per mutual follow)
  //   2. members of the communities I joined (weight 1 per shared community)
  // With a real DB, each signal is one aggregation query; here they are batched array scans.
  async suggestions(userId, limit) {
    const followingIds = await followRepo.listFollowingIds(userId);
    const exclude = new Set([userId, ...followingIds]);

    const mutualFollows = new Map();
    for (const edge of await followRepo.listFollowingOf(followingIds)) {
      if (!exclude.has(edge.followeeId)) {
        mutualFollows.set(edge.followeeId, (mutualFollows.get(edge.followeeId) ?? 0) + 1);
      }
    }

    const mine = await communityRepo.listJoinedBy(userId);
    const shared = new Map(); // userId -> Set of shared community ids
    for (const m of await communityRepo.listMemberships(mine.map((c) => c.id))) {
      if (exclude.has(m.userId)) continue;
      if (!shared.has(m.userId)) shared.set(m.userId, new Set());
      shared.get(m.userId).add(m.communityId);
    }

    const score = (id) => (mutualFollows.get(id) ?? 0) * 3 + (shared.get(id)?.size ?? 0);
    const rankedIds = [...new Set([...mutualFollows.keys(), ...shared.keys()])]
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit);

    const byId = new Map((await userRepo.findByIds(rankedIds)).map((u) => [u.id, u]));
    const ranked = rankedIds.map((id) => byId.get(id)).filter(Boolean);
    const filler =
      ranked.length < limit ? await userRepo.listExcluding([...exclude, ...rankedIds], limit - ranked.length) : [];

    return [...ranked, ...filler].map((u) => ({
      ...toPublicUser(u),
      mutualFollows: mutualFollows.get(u.id) ?? 0,
      sharedCommunities: shared.get(u.id)?.size ?? 0,
    }));
  },
};