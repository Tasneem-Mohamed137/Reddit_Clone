import { z } from 'zod';
import { communityRepo, userRepo } from '../repositories/index.js';
import { toCommunityDto } from './community.service.js';
import { toPublicUser } from './auth.service.js';

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(50),
  type: z.enum(['communities', 'users']).default('communities'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const searchService = {
  async search({ q, type, limit }) {
    if (type === 'users') return (await userRepo.search(q, limit)).map(toPublicUser);
    return (await communityRepo.search(q, limit)).map(toCommunityDto);
  },
};