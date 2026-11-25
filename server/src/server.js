import { app } from './app.js';
import { disconnectMongo } from './repositories/mongo/connection.js';
import { env } from './config/env.js';
import { attachRealtime } from './realtime/hub.js';
import { isRealAiConfigured } from './services/ai.service.js';

const server = app.listen(env.port, () => {
  console.log(`API:  http://localhost:${env.port}/api/v1`);
  console.log(`Docs: http://localhost:${env.port}/api-docs`);
  console.log(
    isRealAiConfigured()
      ? `AI:   ${env.ai.provider} (key loaded)`
      : `AI:   MOCK summaries (provider="${env.ai.provider}", key ${env.ai.apiKey ? 'set' : 'missing'}, check server/.env)`,
  );
});

attachRealtime(server); // WebSocket endpoint: ws://localhost:PORT/ws

// Ctrl+C / platform shutdown: stop accepting requests, then close the MongoDB connection pool cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => disconnectMongo().finally(() => process.exit(0))));
}
