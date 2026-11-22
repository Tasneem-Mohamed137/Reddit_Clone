import { env } from '../config/env.js';

// The ONLY place that knows which storage engine is active.
const drivers = {
  mock: () => import('./mock/index.js'),
  mongo: () => import('./mongo/index.js'),
};

if (!drivers[env.dbDriver]) {
  throw new Error(`Unknown DB_DRIVER "${env.dbDriver}". Use: ${Object.keys(drivers).join(', ')}`);
}

const load = async () => {
  try {
    return await drivers[env.dbDriver]();
  } catch (err) {
    // A driver folder that does not exist yet is the most likely mistake, so say it plainly
    // instead of showing a cryptic ERR_MODULE_NOT_FOUND.
    const missingDriver = err.code === 'ERR_MODULE_NOT_FOUND' && err.message.replaceAll('\\', '/').includes(`${env.dbDriver}/index.js`);
    if (missingDriver) {
      throw new Error(
        `DB_DRIVER="${env.dbDriver}" is not implemented yet. Create src/repositories/${env.dbDriver}/index.js ` +
          '(see repositories/CONTRACT.md) or set DB_DRIVER=mock.',
      );
    }
    throw err;
  }
};

export const {
  userRepo, communityRepo, postRepo, commentRepo, voteRepo, followRepo, chatRepo, notificationRepo, userPostRepo,
} = await load();