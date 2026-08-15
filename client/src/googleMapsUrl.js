// Google Maps' "api=1" directions deep link is capped by the consumer
// product itself (not the paid Directions API) to 10 stops total —
// origin + destination + up to 8 intermediate waypoints — on both desktop
// and mobile. Beyond that Google Maps truncates or ignores the extra stops.
export const MAX_STOPS_PER_LINK = 10;

function toLatLon(a) {
  return `${a.lat},${a.lon}`;
}

// Builds a single Google Maps "directions" deep link (no API key needed)
// that preserves the exact stop order we already computed, so Google Maps
// must not be allowed to re-optimize it (optimize:false is the default
// when the waypoints param has no prefix).
function buildSingleUrl(stops) {
  const [origin, ...rest] = stops;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1);

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('travelmode', 'driving');
  url.searchParams.set('origin', toLatLon(origin));
  url.searchParams.set('destination', toLatLon(destination));
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.map(toLatLon).join('|'));
  }
  return url.toString();
}

// Splits `stops` into groups of at most `maxStops`, each group starting
// with the previous group's last stop, so opening the links back to back
// retraces the full route with no gap at the seams.
export function splitIntoChunks(stops, maxStops = MAX_STOPS_PER_LINK) {
  if (stops.length <= maxStops) return [stops];

  const chunks = [];
  const step = maxStops - 1;
  let start = 0;
  while (start < stops.length - 1) {
    const end = Math.min(start + maxStops, stops.length);
    chunks.push(stops.slice(start, end));
    start = end - 1;
  }
  return chunks;
}

// Returns one or more { url, stops } segments covering the full route in
// order. `roundTrip` appends the starting address back onto the end so the
// closing leg (last stop → home) is included in the link(s) too.
export function buildGoogleMapsUrls(orderedAddresses, { roundTrip = false } = {}) {
  if (!orderedAddresses || orderedAddresses.length < 2) return [];

  const stops = roundTrip ? [...orderedAddresses, orderedAddresses[0]] : orderedAddresses;

  return splitIntoChunks(stops).map((chunk) => ({
    url: buildSingleUrl(chunk),
    stops: chunk,
  }));
}
