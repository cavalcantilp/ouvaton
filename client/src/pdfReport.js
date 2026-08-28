function formatKm(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

// Projects lat/lon onto a flat plane (equirectangular, corrected for
// longitude compression at this latitude) so relative positions and
// distances-on-paper stay roughly proportional to the real geography.
function projectStops(stops) {
  const lats = stops.map((s) => s.lat);
  const lons = stops.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const lonScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) || 1;

  const points = stops.map((s) => ({
    x: (s.lon - minLon) * lonScale,
    y: s.lat - minLat,
  }));

  const spanX = Math.max(...points.map((p) => p.x), 0.0001);
  const spanY = Math.max(...points.map((p) => p.y), 0.0001);

  return { points, spanX, spanY };
}

// Draws a schematic route map (not real cartography — OpenStreetMap's free
// tiles can't be captured to a canvas from the browser without a paid or
// self-hosted proxy, since they aren't served with CORS headers). Numbered
// stops are placed to scale from their real coordinates and joined in
// visiting order, which is enough to see the shape of the trip at a glance.
function drawSchematicMap(doc, order, { closeLoop, x, y, width, height }) {
  const { points: projected, spanX, spanY } = projectStops(order);
  const scale = Math.min(width / spanX, height / spanY) * 0.85;
  const drawWidth = spanX * scale;
  const drawHeight = spanY * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  // PDF y grows downward; north (higher latitude) should render near the top.
  const points = projected.map((p) => ({
    px: offsetX + p.x * scale,
    py: offsetY + (drawHeight - p.y * scale),
  }));

  doc.setDrawColor(225);
  doc.rect(x, y, width, height);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  const segments = closeLoop ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    const next = points[(i + 1) % points.length];
    doc.line(points[i].px, points[i].py, next.px, next.py);
  }

  points.forEach((p, i) => {
    doc.setFillColor(37, 99, 235);
    doc.circle(p.px, p.py, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(String(i + 1), p.px, p.py + 1.1, { align: 'center' });
  });

  doc.setTextColor(130);
  doc.setFontSize(8);
  doc.text('Carte schématique : positions à l’échelle, non géoréférencée (pas de fond de carte).', x, y + height + 5);
}

// Embeds the real tile-based map image, scaled to fit the box without
// distorting it, and adds the attribution CARTO's basemap tiles require.
function drawTileMap(doc, map, { x, y, width, height }) {
  const scale = Math.min(width / map.width, height / map.height);
  const drawWidth = map.width * scale;
  const drawHeight = map.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  doc.addImage(map.dataUrl, 'PNG', offsetX, offsetY, drawWidth, drawHeight);
  doc.setDrawColor(225);
  doc.rect(offsetX, offsetY, drawWidth, drawHeight);

  doc.setTextColor(130);
  doc.setFontSize(8);
  doc.text('Fond de carte © OpenStreetMap contributors, © CARTO', x, y + height + 5);
}

// Builds a PDF with a schematic route map, the list of stops and the
// distance/duration to the next one, then triggers a browser download.
// `legs[i]` is the hop from `order[i]` to `order[i + 1]` (or, for a
// roundtrip's last leg, back to `order[0]`) — same order OSRM returns them
// in, already aligned with the final visiting order.
//
// jsPDF is loaded on demand: its default bundle drags in html2canvas +
// DOMPurify for a `.html()` feature we never use, so importing it eagerly
// would roughly triple the app's initial JS payload for a button most
// sessions won't even click.
export async function downloadItineraryPdf({ order, legs, distanceMeters, durationSeconds }) {
  const [{ jsPDF }, { default: autoTable }, { renderRouteMapCanvas }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('./staticMap.js'),
  ]);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text('Ouvaton — Itinéraire optimisé', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const generatedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  doc.text(`Généré le ${generatedAt}`, 14, 25);

  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(`Distance totale : ${formatKm(distanceMeters)} · Durée totale : ${formatDuration(durationSeconds)}`, 14, 34);

  if (order.length >= 2) {
    const closeLoop = legs.length === order.length;
    const mapBox = { x: 14, y: 42, width: pageWidth - 28, height: 190 };
    let tileMap = null;
    try {
      tileMap = await renderRouteMapCanvas(order, { closeLoop });
    } catch (err) {
      console.error('Fond de carte indisponible, repli sur le schéma:', err);
    }
    if (tileMap) {
      drawTileMap(doc, tileMap, mapBox);
    } else {
      drawSchematicMap(doc, order, { closeLoop, ...mapBox });
    }
  }

  doc.addPage();

  const rows = legs.map((leg, i) => {
    const from = order[i];
    const to = order[(i + 1) % order.length];
    return [String(i + 1), from.label, to.label, formatKm(leg.distanceMeters), formatDuration(leg.durationSeconds)];
  });

  autoTable(doc, {
    startY: 16,
    head: [['#', 'De', 'À', 'Distance', 'Durée']],
    body: rows,
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 10 } },
  });

  doc.save('ouvaton-itineraire.pdf');
}
