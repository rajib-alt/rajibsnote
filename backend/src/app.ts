import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';
import healthRouter from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', healthRouter);
app.use('/api', aiRouter);

// Serve frontend - dist is at backend/dist/index.js, frontend/dist is ../../frontend/dist
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Frontend not built' });
  });
});

export default app;
