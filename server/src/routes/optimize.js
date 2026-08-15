import { Router } from 'express';

const router = Router();

const OSRM_BASE_URL = 'https://router.project-osrm.org';

router.post('/', async (req, res) => {
  const { addresses, fixedStart = true, fixedEnd = false, roundTrip = false, profile = 'driving' } = req.body || {};

  if (!Array.isArray(addresses) || addresses.length < 2) {
    return res.status(400).json({ error: 'Il faut au moins 2 adresses pour calculer un itinéraire.' });
  }
  if (addresses.length > 25) {
    return res.status(400).json({ error: 'Maximum 25 adresses (limite du service OSRM public et de Google Maps).' });
  }
  for (const addr of addresses) {
    if (typeof addr.lat !== 'number' || typeof addr.lon !== 'number') {
      return res.status(400).json({ error: 'Chaque adresse doit avoir une latitude et une longitude valides.' });
    }
  }

  const coordinates = addresses.map((a) => `${a.lon},${a.lat}`).join(';');
  const source = fixedStart ? 'first' : 'any';
  const destination = roundTrip ? source : fixedEnd ? 'last' : 'any';

  const url = new URL(`${OSRM_BASE_URL}/trip/v1/${profile}/${coordinates}`);
  url.searchParams.set('roundtrip', String(roundTrip));
  url.searchParams.set('source', source);
  url.searchParams.set('destination', destination);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      return res.status(502).json({ error: `Le service d'itinéraire n'a pas pu calculer de trajet (${data.code}: ${data.message || 'raison inconnue'}).` });
    }

    const trip = data.trips[0];

    // OSRM returns `waypoints` in the same order as the input coordinates;
    // each entry carries the position it occupies in the optimized trip.
    const result = addresses.map((addr, inputIndex) => ({
      address: addr,
      tripPosition: data.waypoints[inputIndex].waypoint_index,
    }));
    result.sort((a, b) => a.tripPosition - b.tripPosition);

    res.json({
      order: result.map((r) => r.address),
      distanceMeters: trip.distance,
      durationSeconds: trip.duration,
      geometry: trip.geometry,
    });
  } catch (error) {
    console.error("Erreur d'optimisation d'itinéraire:", error);
    res.status(502).json({ error: "Impossible de contacter le service de calcul d'itinéraire pour le moment." });
  }
});

export default router;
