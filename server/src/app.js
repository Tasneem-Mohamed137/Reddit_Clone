import 'express-async-errors';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openapi } from './docs/openapi.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Uploaded files get random names that never change, so browsers can cache them for a week.
// express.static also answers Range requests, which video seeking needs.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true, index: false }));

app.get('/api-docs.json', (_req, res) => res.json(openapi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/v1', apiRouter);

// Production: one server serves the API AND the built React app (client/dist), so the
// auth cookie stays same-origin. Every non-API path falls back to index.html (client-side routing).
if (env.isProd) {
  const dist = path.resolve(process.cwd(), '../client/dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads|ws).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);