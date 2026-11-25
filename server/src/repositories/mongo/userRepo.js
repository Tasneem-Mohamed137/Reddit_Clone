import { AppError } from '../../utils/AppError.js';
import { isDuplicateKey } from './connection.js';
import { CASE_INSENSITIVE, User } from './models.js';
import { escapeRegex, toRecord, toRecords } from './record.js';

const PROFILE_FIELDS = ['displayName', 'bio', 'avatarUrl'];

export const userRepo = {
  async create({ email, username, passwordHash }) {
    try {
      const user = await User.create({ email, username, passwordHash, displayName: username });
      return toRecord(user);
    } catch (err) {
      // The service checks first, but two simultaneous sign-ups can both pass that check.
      // The unique index is the real guarantee; we turn its error into a clean 409.
      if (isDuplicateKey(err)) {
        const field = Object.keys(err.keyPattern ?? {})[0];
        throw AppError.conflict(field === 'email' ? 'Email is already registered' : 'Username is already taken');
      }
      throw err;
    }
  },

  async findById(id) {
    return toRecord(await User.findById(id).lean());
  },

  async findByIds(ids) {
    return toRecords(await User.find({ _id: { $in: ids } }).lean());
  },

  // .collation(...) makes the comparison case-insensitive AND lets MongoDB use the unique index.
  async findByEmail(email) {
    return toRecord(await User.findOne({ email }).collation(CASE_INSENSITIVE).lean());
  },

  async findByUsername(username) {
    return toRecord(await User.findOne({ username }).collation(CASE_INSENSITIVE).lean());
  },

  async usernameExists(username) {
    return Boolean(await User.exists({ username }).collation(CASE_INSENSITIVE));
  },

  // Usernames that START with q first, then other matches (username or display name contains q).
  async search(q, limit = 10) {
    const needle = escapeRegex(q);
    const prefix = await User.find({ username: new RegExp(`^${needle}`, 'i') }).limit(limit).lean();
    const rest =
      prefix.length < limit
        ? await User.find({
            _id: { $nin: prefix.map((u) => u._id) },
            $or: [{ username: new RegExp(needle, 'i') }, { displayName: new RegExp(needle, 'i') }],
          })
            .limit(limit - prefix.length)
            .lean()
        : [];
    return toRecords([...prefix, ...rest]);
  },

  // Newest members first, skipping the given ids. Used to fill "People you may know".
  async listExcluding(excludeIds, limit = 10) {
    return toRecords(
      await User.find({ _id: { $nin: excludeIds } }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean(),
    );
  },

  async updateById(id, patch) {
    const $set = {};
    for (const key of PROFILE_FIELDS) if (patch[key] !== undefined) $set[key] = patch[key];
    // { new: true } returns the document AFTER the update.
    return toRecord(await User.findByIdAndUpdate(id, { $set }, { new: true }).lean());
  },
};
