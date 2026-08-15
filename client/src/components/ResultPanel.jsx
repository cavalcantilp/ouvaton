import { useState } from 'react';
import RouteMap from './RouteMap.jsx';
import { buildGoogleMapsUrls, MAX_STOPS_PER_LINK } from '../googleMapsUrl.js';
import { downloadItineraryPdf } from '../pdfReport.js';

function formatDistance(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export default function ResultPanel({ result, roundTrip }) {
  const [pdfState, setPdfState] = useState('idle'); // idle | loading | error

  if (!result) return null;

  const { order, distanceMeters, durationSeconds, geometry, legs } = result;
  const mapsSegments = buildGoogleMapsUrls(order, { roundTrip });

  async function handleDownloadPdf() {
    setPdfState('loading');
    try {
      await downloadItineraryPdf({ order, legs, distanceMeters, durationSeconds });
      setPdfState('idle');
    } catch (err) {
      console.error('Échec de la génération du PDF:', err);
      setPdfState('error');
    }
  }

  return (
    <div className="result-panel">
      <h2>Itinéraire optimisé</h2>
      <p className="summary">
        {formatDistance(distanceMeters)} · environ {formatDuration(durationSeconds)}
      </p>

      <RouteMap addresses={order} geometry={geometry} />

      {legs && legs.length > 0 && (
        <>
          <button type="button" className="secondary" disabled={pdfState === 'loading'} onClick={handleDownloadPdf}>
            {pdfState === 'loading' ? 'Génération du PDF…' : 'Télécharger le PDF (distances entre chaque étape)'}
          </button>
          {pdfState === 'error' && <p className="error">La génération du PDF a échoué.</p>}
        </>
      )}

      <ol className="address-list result-order">
        {order.map((addr, index) => (
          <li key={`${addr.lat}-${addr.lon}-${index}`}>
            <span className="badge">{index + 1}</span>
            <span className="label">{addr.label}</span>
          </li>
        ))}
      </ol>

      {mapsSegments.length === 1 && (
        <a className="maps-button" href={mapsSegments[0].url} target="_blank" rel="noopener noreferrer">
          Ouvrir dans Google Maps
        </a>
      )}

      {mapsSegments.length > 1 && (
        <>
          <p className="hint">
            Google Maps limite ses liens à {MAX_STOPS_PER_LINK} arrêts : l'itinéraire est scindé en{' '}
            {mapsSegments.length} parties à ouvrir l'une après l'autre (chacune reprend là où la précédente
            s'arrête).
          </p>
          <div className="maps-segments">
            {mapsSegments.map((segment, index) => (
              <a
                key={segment.url}
                className="maps-button"
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Partie {index + 1} sur {mapsSegments.length} ({segment.stops.length} arrêts)
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
