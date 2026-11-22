const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decode = (cursor) => {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null; // a garbage cursor simply restarts from the first page
  }
};

// Keyset pagination over an array already sorted by (key DESC, id DESC).
// The cursor stores the LAST item's (key, id), not an offset, so inserts/deletes
// between requests never cause duplicates or skipped rows.
export const paginate = (sorted, keyOf, { cursor, limit }) => {
  const after = cursor ? decode(cursor) : null;
  let start = 0;
  if (after) {
    start = sorted.findIndex((item) => {
      const key = keyOf(item);
      return key < after.k || (key === after.k && item.id < after.id);
    });
    if (start === -1) start = sorted.length;
  }

  const items = sorted.slice(start, start + limit);
  const last = items.at(-1);
  const hasMore = start + limit < sorted.length;
  return { items, nextCursor: hasMore && last ? encode({ k: keyOf(last), id: last.id }) : null };
};