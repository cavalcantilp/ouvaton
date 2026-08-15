import RouteMap from './RouteMap.jsx';
import { buildGoogleMapsUrl } from '../googleMapsUrl.js';

function formatDistance(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export default function ResultPanel({ result }) {
  if (!result) return null;

  const { order, distanceMeters, durationSeconds, geometry } = result;
  const mapsUrl = buildGoogleMapsUrl(order);

  return (
    <div className="result-panel">
      <h2>Itinéraire optimisé</h2>
      <p className="summary">
        {formatDistance(distanceMeters)} · environ {formatDuration(durationSeconds)}
      </p>

      <RouteMap addresses={order} geometry={geometry} />

      <ol className="address-list result-order">
        {order.map((addr, index) => (
          <li key={`${addr.lat}-${addr.lon}-${index}`}>
            <span className="badge">{index + 1}</span>
            <span className="label">{addr.label}</span>
          </li>
        ))}
      </ol>

      {mapsUrl && (
        <a className="maps-button" href={mapsUrl} target="_blank" rel="noopener noreferrer">
          Ouvrir dans Google Maps
        </a>
      )}
      {order.length > 10 && (
        <p className="hint">
          Google Maps limite le nombre d'étapes affichables ; avec {order.length} adresses, vérifiez que tous les
          arrêts s'affichent bien une fois ouvert.
        </p>
      )}
    </div>
  );
}
