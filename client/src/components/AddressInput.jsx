import { useEffect, useRef, useState } from 'react';
import { searchAddress } from '../api.js';

export default function AddressInput({ onAdd }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchAddress(trimmed);
        setSuggestions(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handlePick(result) {
    onAdd({ label: result.label, lat: result.lat, lon: result.lon });
    setQuery('');
    setSuggestions([]);
  }

  return (
    <div className="address-input">
      <label htmlFor="address-search">Ajouter une adresse</label>
      <input
        id="address-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex : 10 rue de Rivoli, Paris"
        autoComplete="off"
      />
      {loading && <div className="hint">Recherche…</div>}
      {error && <div className="error">{error}</div>}
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => handlePick(s)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
