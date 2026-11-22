import { z } from 'zod';
import { voteRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]), // 0 = remove vote
});

export const voteService = {
  // All the atomicity lives in voteRepo.setVote; the service only maps "missing post" to 404.
  async vote(userId, postId, value) {
    const result = await voteRepo.setVote(userId, postId, value);
    if (!result) throw AppError.notFound('Post not found');
    return result;
  },
};