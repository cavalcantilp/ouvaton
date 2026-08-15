import { useState } from 'react';
import AddressInput from './components/AddressInput.jsx';
import AddressList from './components/AddressList.jsx';
import RouteOptions from './components/RouteOptions.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import { optimizeRoute } from './api.js';

export default function App() {
  const [addresses, setAddresses] = useState([]);
  const [options, setOptions] = useState({ fixedStart: true, fixedEnd: false, roundTrip: false });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function addAddress(addr) {
    setAddresses((prev) => [...prev, addr]);
    setResult(null);
  }

  function removeAddress(index) {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  function moveAddress(from, to) {
    setAddresses((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setResult(null);
  }

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await optimizeRoute({ addresses, ...options });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canOptimize = addresses.length >= 2 && !loading;

  return (
    <div className="app">
      <header>
        <h1>Ouvaton</h1>
        <p className="subtitle">Ajoutez vos adresses, trouvez le meilleur itinéraire, ouvrez-le dans Google Maps.</p>
      </header>

      <main>
        <section className="panel">
          <AddressInput onAdd={addAddress} />
          <AddressList addresses={addresses} onRemove={removeAddress} onMove={moveAddress} />
          <RouteOptions options={options} onChange={setOptions} />

          <button type="button" className="primary" disabled={!canOptimize} onClick={handleOptimize}>
            {loading ? 'Calcul en cours…' : 'Calculer le meilleur itinéraire'}
          </button>
          {addresses.length < 2 && <p className="hint">Ajoutez au moins 2 adresses.</p>}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="panel">
          <ResultPanel result={result} />
        </section>
      </main>

      <footer>
        <p>
          Géocodage : OpenStreetMap Nominatim · Calcul d'itinéraire : OSRM (démo publique) · Ouverture finale : Google
          Maps. Usage personnel, sans clé API, sans frais.
        </p>
      </footer>
    </div>
  );
}
