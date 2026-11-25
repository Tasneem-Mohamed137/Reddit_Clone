// The ONLY place services import storage from. MongoDB is the single database of the app;
// importing this module connects to it (see mongo/index.js) before anything else runs.
export {
  userRepo, communityRepo, postRepo, commentRepo, voteRepo, followRepo, chatRepo, notificationRepo, userPostRepo,
} from './mongo/index.js';
