export default function RouteOptions({ options, onChange }) {
  const { fixedStart, fixedEnd, roundTrip } = options;

  return (
    <fieldset className="route-options">
      <legend>Options du trajet</legend>
      <label>
        <input
          type="checkbox"
          checked={fixedStart}
          onChange={(e) => onChange({ ...options, fixedStart: e.target.checked })}
        />
        Le départ est la 1ère adresse de la liste
      </label>
      <label>
        <input
          type="checkbox"
          checked={roundTrip}
          onChange={(e) => onChange({ ...options, roundTrip: e.target.checked })}
        />
        Retour au point de départ
      </label>
      <label className={roundTrip ? 'disabled' : ''}>
        <input
          type="checkbox"
          checked={fixedEnd}
          disabled={roundTrip}
          onChange={(e) => onChange({ ...options, fixedEnd: e.target.checked })}
        />
        L'arrivée est la dernière adresse de la liste
      </label>
    </fieldset>
  );
}
