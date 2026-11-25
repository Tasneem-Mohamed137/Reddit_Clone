import { AppError } from '../../utils/AppError.js';
import { isDuplicateKey, withTransaction } from './connection.js';
import { CASE_INSENSITIVE, Community, CommunityMember } from './models.js';
import { escapeRegex, toRecord, toRecords } from './record.js';

const EDITABLE_FIELDS = ['description', 'iconUrl', 'bannerUrl', 'rules'];

export const communityRepo = {
  async create({ name, description = '', iconUrl = null, bannerUrl = null, creatorId }) {
    try {
      return toRecord(await Community.create({ name, description, iconUrl, bannerUrl, creatorId }));
    } catch (err) {
      if (isDuplicateKey(err)) throw AppError.conflict('Community name is already taken');
      throw err;
    }
  },

  async update(id, patch) {
    const $set = {};
    for (const key of EDITABLE_FIELDS) if (patch[key] !== undefined) $set[key] = patch[key];
    return toRecord(await Community.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).lean());
  },

  async findById(id) {
    return toRecord(await Community.findById(id).lean());
  },

  async findByIds(ids) {
    return toRecords(await Community.find({ _id: { $in: ids } }).lean());
  },

  async findByName(name) {
    return toRecord(await Community.findOne({ name }).collation(CASE_INSENSITIVE).lean());
  },

  async list({ limit = 10 } = {}) {
    return toRecords(await Community.find().sort({ memberCount: -1, _id: -1 }).limit(limit).lean());
  },

  async search(q, limit = 10) {
    return toRecords(
      await Community.find({ name: new RegExp(escapeRegex(q), 'i') }).sort({ memberCount: -1 }).limit(limit).lean(),
    );
  },

  /**
   * Insert the membership row AND increment memberCount in ONE transaction.
   * Joining twice: the unique (communityId, userId) index rejects the insert (E11000), the
   * transaction aborts, so the counter is NOT incremented either -> a safe no-op.
   */
  async addMember(communityId, userId, role = 'member') {
    try {
      await withTransaction(async (session) => {
        await CommunityMember.create([{ communityId, userId, role }], { session }); // array form is required with a session
        await Community.updateOne({ _id: communityId }, { $inc: { memberCount: 1 } }, { session });
      });
    } catch (err) {
      if (!isDuplicateKey(err)) throw err; // already a member: nothing to do
    }
  },

  async removeMember(communityId, userId) {
    await withTransaction(async (session) => {
      const { deletedCount } = await CommunityMember.deleteOne({ communityId, userId }, { session });
      if (deletedCount) await Community.updateOne({ _id: communityId }, { $inc: { memberCount: -1 } }, { session });
    });
  },

  async getMember(communityId, userId) {
    return toRecord(await CommunityMember.findOne({ communityId, userId }).lean());
  },

  async listModeratorIds(communityId) {
    return CommunityMember.find({ communityId, role: 'moderator' }).distinct('userId');
  },

  // Every (communityId, userId) pair of the given communities.
  async listMemberships(communityIds) {
    return toRecords(await CommunityMember.find({ communityId: { $in: communityIds } }).lean());
  },

  // Two queries instead of a $lookup: first the ids from the join collection, then the communities.
  async listJoinedBy(userId) {
    const ids = await CommunityMember.find({ userId }).distinct('communityId');
    return toRecords(await Community.find({ _id: { $in: ids } }).lean());
  },
};
