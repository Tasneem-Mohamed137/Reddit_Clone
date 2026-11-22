import { z } from 'zod';
import { communityRepo, userRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { imageUrlSchema } from '../utils/mediaUrl.js';
import { toPublicUser } from './auth.service.js';

const ruleSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
});

export const createCommunitySchema = z.object({
  name: z.string().trim().regex(/^[A-Za-z0-9_]{3,21}$/, '3-21 characters: letters, numbers or _'),
  description: z.string().trim().max(500).default(''),
  iconUrl: imageUrlSchema.nullish(),
  bannerUrl: imageUrlSchema.nullish(),
});

// What a moderator can change after creation (the name is permanent, like on Reddit).
export const updateCommunitySchema = z.object({
  description: z.string().trim().max(500).optional(),
  iconUrl: imageUrlSchema.nullable().optional(),
  bannerUrl: imageUrlSchema.nullable().optional(),
  rules: z.array(ruleSchema).max(10).optional(),
});

export const listCommunitiesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const toCommunityDto = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  iconUrl: c.iconUrl,
  bannerUrl: c.bannerUrl,
  rules: c.rules ?? [],
  memberCount: c.memberCount,
  createdAt: c.createdAt,
});

export const findCommunityOrThrow = async (name) => {
  const community = await communityRepo.findByName(name);
  if (!community) throw AppError.notFound('Community not found');
  return community;
};

export const communityService = {
  async isModerator(communityId, userId) {
    const member = await communityRepo.getMember(communityId, userId);
    return member?.role === 'moderator';
  },

  async create(userId, input) {
    if (await communityRepo.findByName(input.name)) throw AppError.conflict('Community name is already taken');
    const community = await communityRepo.create({ ...input, creatorId: userId });
    // The creator automatically becomes the moderator (and a member).
    await communityRepo.addMember(community.id, userId, 'moderator');
    return toCommunityDto(await communityRepo.findById(community.id));
  },

  async update(name, userId, patch) {
    const community = await findCommunityOrThrow(name);
    if (!(await this.isModerator(community.id, userId))) throw AppError.forbidden('Only moderators can edit this community');
    await communityRepo.update(community.id, patch);
    return this.getByName(name, userId);
  },

  async getByName(name, viewerId) {
    const community = await findCommunityOrThrow(name);
    const moderators = await userRepo.findByIds(await communityRepo.listModeratorIds(community.id));
    const member = viewerId ? await communityRepo.getMember(community.id, viewerId) : null;
    return {
      ...toCommunityDto(community),
      moderators: moderators.map(toPublicUser),
      isMember: Boolean(member),
      isModerator: member?.role === 'moderator',
    };
  },

  async list(limit) {
    return (await communityRepo.list({ limit })).map(toCommunityDto);
  },

  async join(name, userId) {
    const community = await findCommunityOrThrow(name);
    await communityRepo.addMember(community.id, userId); // idempotent
    return this.getByName(name, userId);
  },

  async leave(name, userId) {
    const community = await findCommunityOrThrow(name);
    if (await this.isModerator(community.id, userId)) {
      throw AppError.badRequest('Moderators cannot leave their community', 'MODERATOR_CANNOT_LEAVE');
    }
    await communityRepo.removeMember(community.id, userId);
    return this.getByName(name, userId);
  },

  async listJoined(userId) {
    return (await communityRepo.listJoinedBy(userId)).map(toCommunityDto);
  },
};