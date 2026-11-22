import { z } from 'zod';
import { postRepo, userPostRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { communityService, findCommunityOrThrow } from './community.service.js';
import { findPostOrThrow } from './post.service.js';

const MAX_PINNED = 2;

export const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'hate', 'violence', 'misinformation', 'other']),
});

const requireModerator = async (communityId, userId, message) => {
  if (!(await communityService.isModerator(communityId, userId))) throw AppError.forbidden(message);
};

// Per-user actions on a post (save, hide, report) and the moderator tools (pin, reports queue).
export const postActionService = {
  async save(userId, postId, saved) {
    await findPostOrThrow(postId);
    await userPostRepo.setSaved(userId, postId, saved);
    return { saved };
  },

  async hide(userId, postId, hidden) {
    await findPostOrThrow(postId);
    await userPostRepo.setHidden(userId, postId, hidden);
    return { hidden };
  },

  // Reporting the same post twice is accepted but counted once.
  async report(userId, postId, reason) {
    await findPostOrThrow(postId);
    await userPostRepo.report({ userId, postId, reason });
    return { reported: true };
  },

  async pin(userId, postId, pinned) {
    const post = await findPostOrThrow(postId);
    await requireModerator(post.communityId, userId, 'Only moderators can pin posts');
    if (pinned && !post.pinned && (await postRepo.countPinned(post.communityId)) >= MAX_PINNED) {
      throw AppError.badRequest(`A community can pin at most ${MAX_PINNED} posts`, 'TOO_MANY_PINNED');
    }
    await postRepo.setPinned(postId, pinned);
    return { pinned };
  },

  // The moderator queue: reported posts of one community. The reporters' identities are not exposed.
  async listReports(userId, communityName) {
    const community = await findCommunityOrThrow(communityName);
    await requireModerator(community.id, userId, 'Only moderators can see reports');
    const { items } = await postRepo.list({ communityIds: [community.id], sort: 'new', limit: 200 });
    const reports = await userPostRepo.listReportsFor(items.map((p) => p.id));
    return items
      .filter((p) => reports.some((r) => r.postId === p.id))
      .map((p) => ({
        post: { id: p.id, title: p.title },
        reports: reports.filter((r) => r.postId === p.id).map((r) => ({ reason: r.reason, createdAt: r.createdAt })),
      }));
  },
};