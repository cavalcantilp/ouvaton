export default function AddressList({ addresses, onRemove, onMove }) {
  if (addresses.length === 0) {
    return <p className="hint">Aucune adresse ajoutée pour le moment.</p>;
  }

  return (
    <ol className="address-list">
      {addresses.map((addr, index) => (
        <li key={`${addr.lat}-${addr.lon}-${index}`}>
          <span className="badge">{index + 1}</span>
          <span className="label">{addr.label}</span>
          <span className="actions">
            <button type="button" title="Monter" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
              ↑
            </button>
            <button
              type="button"
              title="Descendre"
              disabled={index === addresses.length - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ↓
            </button>
            <button type="button" title="Supprimer" className="remove" onClick={() => onRemove(index)}>
              ✕
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
