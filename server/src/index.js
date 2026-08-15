import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import geocodeRouter from './routes/geocode.js';
import optimizeRouter from './routes/optimize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ouvaton is a personal tool, but this still protects the free upstream
// services (Nominatim, OSRM demo server) from accidental request storms.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use('/api/geocode', geocodeRouter);
app.use('/api/optimize', optimizeRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// In production, serve the built React app from the same server/port.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build introuvable. Lancez `npm run build` au préalable.');
  });
});

app.listen(PORT, () => {
  console.log(`Ouvaton server listening on http://localhost:${PORT}`);
});
