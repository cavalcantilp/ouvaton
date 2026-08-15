import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

function numberedIcon(number) {
  return L.divIcon({
    className: 'numbered-marker',
    html: `<span>${number}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export default function RouteMap({ addresses, geometry }) {
  const points = addresses.map((a) => [a.lat, a.lon]);
  const routeLine = geometry ? geometry.coordinates.map(([lon, lat]) => [lat, lon]) : null;

  return (
    <MapContainer center={points[0] || [46.6, 2.2]} zoom={6} className="route-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLine && <Polyline positions={routeLine} pathOptions={{ color: '#2563eb', weight: 4 }} />}
      {addresses.map((addr, index) => (
        <Marker key={`${addr.lat}-${addr.lon}-${index}`} position={[addr.lat, addr.lon]} icon={numberedIcon(index + 1)}>
          <Tooltip>{addr.label}</Tooltip>
        </Marker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
