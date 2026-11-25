import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { allModels } from './models.js';

mongoose.set('strictQuery', true); // unknown fields in a filter are an error, not silently ignored

/**
 * Opens the ONE shared connection (Mongoose keeps a pool of sockets behind it).
 * Called once at startup by mongo/index.js, before the server accepts requests.
 */
export const connectMongo = async ({ uri = env.mongoUri, dbName = env.mongoDbName } = {}) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000 });

  // Voting, cascading deletes and counters use transactions. MongoDB only allows transactions
  // on a replica set (Atlas always is one). Fail at startup with a clear message instead of
  // failing on the first vote.
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error(
      'MongoDB is running as a standalone server, but this app needs transactions. ' +
        'Use a MongoDB Atlas cluster, or start a local mongod with --replSet rs0 and run rs.initiate().',
    );
  }

  // Build every index declared in models.js (unique constraints included) BEFORE serving traffic.
  // Without this, the first requests could race and create duplicates the unique index should block.
  await Promise.all(allModels.map((model) => model.init()));
  return mongoose.connection;
};

export const disconnectMongo = () => mongoose.disconnect();

/**
 * Runs `work(session)` inside a transaction: every write either commits together or not at all.
 * `withTransaction` automatically retries on transient errors (e.g. two votes on the same post
 * at the same time -> WriteConflict -> the loser is retried with fresh data).
 * Every query inside `work` MUST pass `{ session }`, otherwise it runs outside the transaction.
 */
export const withTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session); // may run more than once on retry, so `work` must not have side effects outside the DB
    });
    return result;
  } finally {
    await session.endSession();
  }
};

// E11000 = a unique index rejected the write (duplicate key).
export const isDuplicateKey = (err) => err?.code === 11000 || err?.cause?.code === 11000;
