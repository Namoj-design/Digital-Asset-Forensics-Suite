import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { ensureUploadDir } from './config/uploadMulter.js';
import { log } from './utils/logger.js';
import { sanitizeBody } from './middlewares/sanitizeBody.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

import authRoutes from './routes/auth.routes.js';
import casesRoutes from './routes/cases.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import graphRoutes from './routes/graph.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import addressesRoutes from './routes/addresses.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = ensureUploadDir();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeBody);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dafs-forensics-api', time: new Date().toISOString() });
});

app.use('/login', authRoutes);
app.use('/cases', casesRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/graph', graphRoutes);
app.use('/upload', uploadRoutes);
app.use('/evidence', evidenceRoutes);
app.use('/addresses', addressesRoutes);

app.use('/uploads', express.static(uploadRoot));

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  log.info(`DAFS Forensics API listening on port ${env.port}`, { database: env.databaseUrl.replace(/:[^:@]+@/, ':****@') });
});
