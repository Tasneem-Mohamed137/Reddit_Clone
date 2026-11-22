import { z } from 'zod';
import { commentRepo, voteRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]), // 0 = remove vote
});

export const voteService = {
  // All the atomicity lives in voteRepo; the service only maps "missing target" to 404.
  async vote(userId, postId, value) {
    const result = await voteRepo.setVote(userId, postId, value);
    if (!result) throw AppError.notFound('Post not found');
    return result;
  },

  async voteComment(userId, commentId, value) {
    const comment = await commentRepo.findById(commentId);
    if (!comment) throw AppError.notFound('Comment not found');
    if (comment.deleted) throw AppError.badRequest('You cannot vote on a deleted comment', 'COMMENT_DELETED');
    const result = await voteRepo.setCommentVote(userId, commentId, value);
    if (!result) throw AppError.notFound('Comment not found');
    return result;
  },
};