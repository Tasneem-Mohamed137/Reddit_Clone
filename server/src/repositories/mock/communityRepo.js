import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export const communityRepo = {
  async create({ name, description = '', iconUrl = null, bannerUrl = null, creatorId }) {
    const { communities } = getDb();
    if (communities.some((c) => same(c.name, name))) throw new Error('DUPLICATE_COMMUNITY');
    const community = {
      id: randomUUID(),
      name,
      description,
      iconUrl,
      bannerUrl,
      creatorId,
      memberCount: 0,
      createdAt: new Date().toISOString(),
    };
    communities.push(community);
    persist();
    return community;
  },

  async findById(id) {
    return getDb().communities.find((c) => c.id === id) ?? null;
  },

  async findByIds(ids) {
    const set = new Set(ids);
    return getDb().communities.filter((c) => set.has(c.id));
  },

  async findByName(name) {
    return getDb().communities.find((c) => same(c.name, name)) ?? null;
  },

  async list({ limit = 10 } = {}) {
    return [...getDb().communities].sort((a, b) => b.memberCount - a.memberCount).slice(0, limit);
  },

  async search(q, limit = 10) {
    const needle = q.toLowerCase();
    return getDb()
      .communities.filter((c) => c.name.toLowerCase().includes(needle))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, limit);
  },

  async addMember(communityId, userId, role = 'member') {
    const db = getDb();
    // Mirrors the unique (communityId, userId) index.
    if (db.members.some((m) => m.communityId === communityId && m.userId === userId)) return;
    db.members.push({ communityId, userId, role, joinedAt: new Date().toISOString() });
    db.communities.find((c) => c.id === communityId).memberCount += 1;
    persist();
  },

  async removeMember(communityId, userId) {
    const db = getDb();
    const before = db.members.length;
    db.members = db.members.filter((m) => !(m.communityId === communityId && m.userId === userId));
    if (db.members.length < before) {
      db.communities.find((c) => c.id === communityId).memberCount -= 1;
      persist();
    }
  },

  async getMember(communityId, userId) {
    return getDb().members.find((m) => m.communityId === communityId && m.userId === userId) ?? null;
  },

  async listModeratorIds(communityId) {
    return getDb()
      .members.filter((m) => m.communityId === communityId && m.role === 'moderator')
      .map((m) => m.userId);
  },

    // Every (communityId, userId) pair of the given communities.
  async listMemberships(communityIds) {
    const wanted = new Set(communityIds);
    return getDb().members.filter((m) => wanted.has(m.communityId));
  },
  
  async listJoinedBy(userId) {
    const db = getDb();
    const ids = new Set(db.members.filter((m) => m.userId === userId).map((m) => m.communityId));
    return db.communities.filter((c) => ids.has(c.id));
  },
};