// Renders a real street-map background for the route, entirely client-side
// and free: standard OpenStreetMap tiles aren't served with CORS headers so
// they can't be drawn onto a <canvas> and exported (the canvas becomes
// "tainted" and toDataURL throws). CARTO's basemap tiles are the same OSM
// data restyled, but are served with permissive CORS — which is exactly why
// they're a common choice for client-side map-to-image exports.
const TILE_SIZE = 256;
const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'];

function lonToPx(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToPx(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * TILE_SIZE * 2 ** zoom;
}

// Largest zoom (most detail) at which the whole bbox still fits in the
// target pixel box — the same idea as Leaflet's fitBounds.
function pickZoom(minLon, minLat, maxLon, maxLat, maxWidthPx, maxHeightPx) {
  const MIN_ZOOM = 2;
  const MAX_ZOOM = 15;
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
    const w = lonToPx(maxLon, z) - lonToPx(minLon, z);
    const h = latToPx(minLat, z) - latToPx(maxLat, z);
    if (w <= maxWidthPx && h <= maxHeightPx) return z;
  }
  return MIN_ZOOM;
}

function loadTileImage(z, x, y, maxTileIndex) {
  return new Promise((resolve) => {
    if (x < 0 || y < 0 || x > maxTileIndex || y > maxTileIndex) {
      resolve(null);
      return;
    }
    const subdomain = CARTO_SUBDOMAINS[(x + y) % CARTO_SUBDOMAINS.length];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    // A missing/blocked tile just leaves a gap — never breaks the export.
    img.onerror = () => resolve(null);
    img.src = `https://${subdomain}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
  });
}

function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))]);
}

// Returns a canvas with the map tiles + route line + numbered markers, or
// null if the map tiles couldn't be loaded (offline, blocked, tile server
// down) — callers should fall back to a non-tile visualization in that case.
export async function renderRouteMapCanvas(order, { closeLoop, maxWidthPx = 760, maxHeightPx = 760 } = {}) {
  if (typeof document === 'undefined' || order.length < 2) return null;

  const lats = order.map((s) => s.lat);
  const lons = order.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const zoom = pickZoom(minLon, minLat, maxLon, maxLat, maxWidthPx - 80, maxHeightPx - 80);
  const maxTileIndex = 2 ** zoom - 1;

  const pad = 40; // px, so markers near the edge aren't clipped
  const pxMinX = lonToPx(minLon, zoom) - pad;
  const pxMaxX = lonToPx(maxLon, zoom) + pad;
  const pxMinY = latToPx(maxLat, zoom) - pad; // higher latitude -> smaller y
  const pxMaxY = latToPx(minLat, zoom) + pad;

  const tileMinX = Math.floor(pxMinX / TILE_SIZE);
  const tileMaxX = Math.floor(pxMaxX / TILE_SIZE);
  const tileMinY = Math.floor(pxMinY / TILE_SIZE);
  const tileMaxY = Math.floor(pxMaxY / TILE_SIZE);

  const originX = tileMinX * TILE_SIZE;
  const originY = tileMinY * TILE_SIZE;
  const canvasWidth = (tileMaxX - tileMinX + 1) * TILE_SIZE;
  const canvasHeight = (tileMaxY - tileMinY + 1) * TILE_SIZE;

  // A very zoomed-out bbox (e.g. two stops on opposite ends of the country)
  // can still ask for a lot of low-zoom tiles; keep the fetch bounded.
  const tileCount = (tileMaxX - tileMinX + 1) * (tileMaxY - tileMinY + 1);
  if (tileCount > 64) return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  const tileLoads = [];
  for (let tx = tileMinX; tx <= tileMaxX; tx++) {
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      tileLoads.push(
        withTimeout(loadTileImage(zoom, tx, ty, maxTileIndex), 8000, null).then((img) => {
          if (img) ctx.drawImage(img, tx * TILE_SIZE - originX, ty * TILE_SIZE - originY);
          return Boolean(img);
        })
      );
    }
  }
  const loaded = await Promise.all(tileLoads);
  // If most tiles failed (offline, blocked, tile server down), the result
  // would be mostly blank — not a tainted canvas (nothing cross-origin was
  // ever drawn), so toDataURL below would happily return an empty image.
  // Bail out explicitly so the caller falls back to the schematic diagram.
  const loadedCount = loaded.filter(Boolean).length;
  if (loadedCount < loaded.length / 2) return null;

  const project = (stop) => ({
    x: lonToPx(stop.lon, zoom) - originX,
    y: latToPx(stop.lat, zoom) - originY,
  });
  const points = order.map(project);

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  const segments = closeLoop ? points.length : points.length - 1;
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = '#2563eb';
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), p.x, p.y + 1);
  });

  try {
    return { dataUrl: canvas.toDataURL('image/png'), width: canvasWidth, height: canvasHeight };
  } catch {
    // A tainted canvas (a tile loaded without the expected CORS headers)
    // throws here instead of failing earlier — treat it the same way.
    return null;
  }
}
