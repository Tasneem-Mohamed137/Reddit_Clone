import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(process.cwd(), process.env.DATA_FILE ?? 'data.json');
const emptyDb = () => ({
  users: [],
  communities: [],
  members: [],
  posts: [],
  comments: [],
  votes: [],
  follows: [],
  chats: [],
  messages: [],
});

let db = null;
let timer = null;

export const getDb = () => {
  if (!db) {
    db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : emptyDb();
    // An older data.json may not have the newer collections yet.
    for (const [key, value] of Object.entries(emptyDb())) db[key] ??= value;
  }
  return db;
};

// Write to a temp file then rename, so a crash mid-write never corrupts data.json.
export const flush = () => {
  clearTimeout(timer);
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(getDb(), null, 2));
  fs.renameSync(`${FILE}.tmp`, FILE);
};

// Debounced so bursts of writes cost one disk write.
export const persist = () => {
  clearTimeout(timer);
  timer = setTimeout(flush, 100);
};

export const resetDb = () => {
  db = emptyDb();
  flush();
};