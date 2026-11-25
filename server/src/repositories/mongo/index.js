import { connectMongo } from './connection.js';

// Top-level await: importing the repositories waits until MongoDB is connected and every index
// exists, so the server never accepts a request it cannot store.
await connectMongo();

export { userRepo } from './userRepo.js';
export { communityRepo } from './communityRepo.js';
export { postRepo } from './postRepo.js';
export { commentRepo } from './commentRepo.js';
export { voteRepo } from './voteRepo.js';
export { followRepo } from './followRepo.js';
export { chatRepo } from './chatRepo.js';
export { notificationRepo } from './notificationRepo.js';
export { userPostRepo } from './userPostRepo.js';
