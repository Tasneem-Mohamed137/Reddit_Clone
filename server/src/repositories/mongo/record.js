/**
 * The "anti-corruption layer" between MongoDB and the services.
 *
 * MongoDB gives us `_id` and real Date objects. The repository contract (CONTRACT.md) promises
 * services plain objects with `id` and ISO-8601 date STRINGS. Services rely on that, e.g.
 * `post.updatedAt !== post.createdAt` (string comparison) and `m.createdAt < before`.
 * Every repo function returns data through `toRecord` so nothing Mongo-specific leaks out.
 */
const convert = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === 'object' && !(value instanceof Buffer)) {
    const out = {};
    for (const [key, inner] of Object.entries(value)) out[key] = convert(inner);
    return out;
  }
  return value;
};

// Accepts a lean object (from .lean()) or a Mongoose document (from create()).
export const toRecord = (doc) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, ...rest } = plain;
  return { id: _id, ...convert(rest) };
};

export const toRecords = (docs) => docs.map(toRecord);

// Escapes user input before putting it in a RegExp, so searching for "c++" or ".*" is literal
// (and cannot be used for a slow "ReDoS" pattern).
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
