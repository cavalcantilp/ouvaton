// Builds a Google Maps "directions" deep link (no API key needed) that
// preserves the exact stop order we already computed, so Google Maps must
// not be allowed to re-optimize it (optimize:false is the default when the
// waypoints param has no prefix).
export function buildGoogleMapsUrl(orderedAddresses) {
  if (!orderedAddresses || orderedAddresses.length < 2) return null;

  const toLatLon = (a) => `${a.lat},${a.lon}`;
  const [origin, ...rest] = orderedAddresses;
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
