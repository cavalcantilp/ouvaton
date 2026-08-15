const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

// Nominatim's usage policy caps anonymous usage at ~1 request/second. This
// tiny queue serialises our outgoing requests so a burst of address lookups
// never breaks that rule (there's no backend anymore to do this for us).
const MIN_INTERVAL_MS = 1100;
let queue = Promise.resolve();
let lastCallAt = 0;

function throttled(task) {
  const run = async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  };
  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function searchAddress(query) {
  return throttled(async () => {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('limit', '5');

    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    if (!res.ok) {
      throw new Error('La recherche a échoué.');
    }
    const data = await res.json();
    return data.map((item) => ({
      id: item.place_id,
      label: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  });
}

export async function optimizeRoute({ addresses, fixedStart, fixedEnd, roundTrip, profile = 'driving' }) {
  if (!Array.isArray(addresses) || addresses.length < 2) {
    throw new Error('Il faut au moins 2 adresses pour calculer un itinéraire.');
  }
  if (addresses.length > 25) {
    throw new Error('Maximum 25 adresses (limite du service OSRM public et de Google Maps).');
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

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    throw new Error("Impossible de contacter le service de calcul d'itinéraire pour le moment.");
  }

  if (data.code !== 'Ok') {
    throw new Error(`Le service d'itinéraire n'a pas pu calculer de trajet (${data.code}: ${data.message || 'raison inconnue'}).`);
  }

  const trip = data.trips[0];
  // OSRM returns `waypoints` in the same order as the input coordinates;
  // each entry carries the position it occupies in the optimized trip.
  const result = addresses.map((addr, inputIndex) => ({
    address: addr,
    tripPosition: data.waypoints[inputIndex].waypoint_index,
  }));
  result.sort((a, b) => a.tripPosition - b.tripPosition);

  return {
    order: result.map((r) => r.address),
    distanceMeters: trip.distance,
    durationSeconds: trip.duration,
    geometry: trip.geometry,
  };
}
