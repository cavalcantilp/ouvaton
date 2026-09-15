const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

// Base Adresse Nationale: France's official, free, no-key geocoder — built
// specifically from French cadastral/postal data, so it's both far more
// complete on French addresses than a global geocoder like Nominatim and
// inherently France-only (no country filter needed). It's designed for
// live autocomplete traffic, so unlike Nominatim it doesn't need
// client-side request throttling.
export async function searchAddress(query) {
  const url = new URL(BAN_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('La recherche a échoué.');
  }
  const data = await res.json();
  return data.features.map((feature) => ({
    id: feature.properties.id || `${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}`,
    label: feature.properties.label,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
  }));
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
  // OSRM only accepts 'any' or 'last' for destination — a roundtrip already
  // closes the loop back to the source, so 'any' is correct there too.
  const destination = !roundTrip && fixedEnd ? 'last' : 'any';

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

  // trip.legs[i] is the hop from order[i] to order[i+1] (already in
  // optimized-order sequence — legs are returned in trip order, not input
  // order). A roundtrip has one extra leg closing back to the start.
  const legs = (trip.legs || []).map((leg) => ({
    distanceMeters: leg.distance,
    durationSeconds: leg.duration,
  }));

  return {
    order: result.map((r) => r.address),
    distanceMeters: trip.distance,
    durationSeconds: trip.duration,
    geometry: trip.geometry,
    legs,
  };
}
