/**
 * KEYSET pagination (a.k.a. cursor / seek pagination).
 *
 * Instead of skip(20).limit(10) (slow on big collections, and shows duplicates when new posts
 * arrive between page loads) we remember the LAST item of the page: its sort key and its _id.
 * The next page is "everything strictly after that item" in the order (key DESC, _id DESC):
 *
 *   { $or: [ { key: { $lt: k } },              // smaller key
 *            { key: k, _id: { $lt: id } } ] }   // same key, smaller _id (tie breaker)
 *
 * With an index on { key: -1, _id: -1 } MongoDB jumps straight to that point in the index.
 * The cursor format { k, id } (base64url JSON) is the same one the mock used, so the frontend
 * does not notice the change.
 */
export const encodeCursor = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return value && typeof value.id === 'string' && typeof value.k === 'number' ? value : null;
  } catch {
    return null; // a garbage cursor simply restarts from the first page
  }
};

/**
 * @param field     the sort field in MongoDB ('createdAt' | 'score' | 'hotScore')
 * @param after     decoded cursor { k, id }; for dates `k` is epoch milliseconds
 */
export const afterCursorFilter = (field, after) => {
  if (!after) return null;
  const k = field === 'createdAt' ? new Date(after.k) : after.k;
  return { $or: [{ [field]: { $lt: k } }, { [field]: k, _id: { $lt: after.id } }] };
};

// Cursor key of a LEAN document (before toRecord turns dates into strings).
export const keyOf = (field, doc) => (field === 'createdAt' ? doc.createdAt.getTime() : doc[field]);
