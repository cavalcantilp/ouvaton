import { Router } from 'express';
import { runThrottled } from '../lib/nominatimQueue.js';

const router = Router();

// In-memory cache: identical searches (very common while a user is typing
// then re-editing) don't need to hit Nominatim again.
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) {
    return res.status(400).json({ error: 'Le paramètre "q" (adresse recherchée) est requis.' });
  }

  const cacheKey = q.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const results = await runThrottled(async () => {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '0');
      url.searchParams.set('limit', '5');

      const response = await fetch(url, {
        headers: {
          // Nominatim's usage policy requires a descriptive User-Agent.
          'User-Agent': 'Ouvaton/1.0 (personal route-planning app; contact: cavalcantilp@gmail.com)',
          'Accept-Language': 'fr',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim a répondu avec le statut ${response.status}`);
      }

      const data = await response.json();
      return data.map((item) => ({
        id: item.place_id,
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    });

    cache.set(cacheKey, { at: Date.now(), value: results });
    res.json(results);
  } catch (error) {
    console.error('Erreur de géocodage:', error);
    res.status(502).json({ error: "Impossible de contacter le service de géocodage pour le moment." });
  }
});

export default router;
