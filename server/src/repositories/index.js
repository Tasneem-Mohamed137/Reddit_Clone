import { env } from '../config/env.js';

// The ONLY place that knows which storage engine is active.
const drivers = {
  mock: () => import('./mock/index.js'),
  mongo: () => import('./mongo/index.js'),
};

if (!drivers[env.dbDriver]) {
  throw new Error(`Unknown DB_DRIVER "${env.dbDriver}". Use: ${Object.keys(drivers).join(', ')}`);
}

export const { userRepo, communityRepo, postRepo, commentRepo, voteRepo, followRepo, chatRepo } =
  await drivers[env.dbDriver]();