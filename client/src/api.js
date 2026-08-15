export async function searchAddress(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'La recherche a échoué.');
  }
  return res.json();
}

export async function optimizeRoute({ addresses, fixedStart, fixedEnd, roundTrip }) {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresses, fixedStart, fixedEnd, roundTrip }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Le calcul de l'itinéraire a échoué.");
  }
  return res.json();
}
