import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export const userRepo = {
  async create({ email, username, passwordHash }) {
    const { users } = getDb();
    // Mirrors the unique indexes the real DB will enforce.
    if (users.some((u) => same(u.email, email))) throw new Error('DUPLICATE_EMAIL');
    if (users.some((u) => same(u.username, username))) throw new Error('DUPLICATE_USERNAME');

    const user = {
      id: randomUUID(),
      email,
      username,
      passwordHash,
      displayName: username,
      bio: '',
      avatarUrl: null,
      karma: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    persist();
    return user;
  },

  async findById(id) {
    return getDb().users.find((u) => u.id === id) ?? null;
  },

  async findByIds(ids) {
    const set = new Set(ids);
    return getDb().users.filter((u) => set.has(u.id));
  },

  async findByEmail(email) {
    return getDb().users.find((u) => same(u.email, email)) ?? null;
  },

  async findByUsername(username) {
    return getDb().users.find((u) => same(u.username, username)) ?? null;
  },

  async usernameExists(username) {
    return getDb().users.some((u) => same(u.username, username));
  },

  async search(q, limit = 10) {
    const needle = q.toLowerCase();
    return getDb()
      .users.filter((u) => u.username.toLowerCase().includes(needle) || u.displayName.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.username.toLowerCase().startsWith(needle)) - Number(a.username.toLowerCase().startsWith(needle)))
      .slice(0, limit);
  },

    // Newest members first, skipping the given ids. Used to fill "People you may know".
  async listExcluding(excludeIds, limit = 10) {
    const skip = new Set(excludeIds);
    return getDb()
      .users.filter((u) => !skip.has(u.id))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  },

  async updateById(id, patch) {
    const user = getDb().users.find((u) => u.id === id);
    if (!user) return null;
    for (const key of ['displayName', 'bio', 'avatarUrl']) {
      if (patch[key] !== undefined) user[key] = patch[key];
    }
    persist();
    return user;
  },
};