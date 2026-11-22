import { z } from 'zod';
import { commentRepo, communityRepo, followRepo, postRepo, userRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser, toSelf } from './auth.service.js';
import { imageUrlSchema } from '../utils/mediaUrl.js';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(30).optional(),
  bio: z.string().trim().max(200).optional(),
  avatarUrl: imageUrlSchema.nullable().optional(),
});

const findUserOrThrow = async (username) => {
  const user = await userRepo.findByUsername(username);
  if (!user) throw AppError.notFound('User not found');
  return user;
};

export const userService = {
  // Karma = total score of the user's posts (computed on read, so it can never drift).
  async getProfile(username, viewerId) {
    const user = await findUserOrThrow(username);
    const [karma, followerCount, followingCount, followsYou] = await Promise.all([
      postRepo.sumScoreByAuthor(user.id),
      followRepo.countFollowers(user.id),
      followRepo.countFollowing(user.id),
      viewerId ? followRepo.isFollowing(user.id, viewerId) : false,
    ]);
    return { ...toPublicUser(user), karma, cakeDay: user.createdAt, followerCount, followingCount, followsYou };
  },

  async updateMe(userId, patch) {
    const user = await userRepo.updateById(userId, patch);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    return toSelf(user);
  },

  async listComments(username) {
    const user = await findUserOrThrow(username);
    const comments = (await commentRepo.listByAuthor(user.id)).filter((c) => !c.deleted);
    const posts = new Map((await postRepo.findByIds([...new Set(comments.map((c) => c.postId))])).map((p) => [p.id, p]));
    const communities = new Map(
      (await communityRepo.findByIds([...new Set([...posts.values()].map((p) => p.communityId))])).map((c) => [c.id, c]),
    );

    return comments
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((c) => {
        const post = posts.get(c.postId);
        return {
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          post: { id: post.id, title: post.title, communityName: communities.get(post.communityId).name },
        };
      });
  },
};