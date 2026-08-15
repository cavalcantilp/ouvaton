function formatKm(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

// Builds a PDF listing each stop of the optimized route and the
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
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Ouvaton — Itinéraire optimisé', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const generatedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  doc.text(`Généré le ${generatedAt}`, 14, 25);

  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(`Distance totale : ${formatKm(distanceMeters)} · Durée totale : ${formatDuration(durationSeconds)}`, 14, 34);

  const rows = legs.map((leg, i) => {
    const from = order[i];
    const to = order[(i + 1) % order.length];
    return [String(i + 1), from.label, to.label, formatKm(leg.distanceMeters), formatDuration(leg.durationSeconds)];
  });

  autoTable(doc, {
    startY: 40,
    head: [['#', 'De', 'À', 'Distance', 'Durée']],
    body: rows,
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 10 } },
  });

  doc.save('ouvaton-itineraire.pdf');
}
