import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { postRepo } from '../repositories/index.js';

const UPLOADED_FILE = /^\/uploads\/([A-Za-z0-9_-]+\.(?:jpg|png|gif|webp|mp4|webm|mov))$/;

export const mediaService = {
  // Deletes uploaded files that no post shows any more (after a post was deleted or its media edited).
  // External links are not ours to delete. The strict pattern also makes path tricks impossible.
  async removeIfUnused(urls) {
    for (const url of new Set(urls)) {
      const match = UPLOADED_FILE.exec(url);
      if (match && !(await postRepo.isMediaUsed(url))) {
        await fs.rm(path.join(UPLOAD_DIR, match[1]), { force: true });
      }
    }
  },
};