import { BaseStation } from '../App';

interface Props {
  baseStations: BaseStation[];
  placementMode: boolean;
  pendingName: string;
  onNameChange: (value: string) => void;
  onPlacementToggle: (active: boolean) => void;
}

export function BaseStationForm({
  baseStations,
  placementMode,
  pendingName,
  onNameChange,
  onPlacementToggle,
}: Props) {
  return (
    <div className="card">
      <h2>Basistationen</h2>
      <p className="hint">
        Name eintragen, "Position setzen" aktivieren und auf die Karte klicken, um einen neuen
        Standort anzulegen.
      </p>

      <div className="form-row">
        <input
          value={pendingName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="z. B. Baufeld-Nord"
        />
        <button
          type="button"
          className={placementMode ? 'secondary' : ''}
          onClick={() => onPlacementToggle(!placementMode)}
          disabled={!pendingName.trim()}
        >
          {placementMode ? 'Klicken zum Platzieren…' : 'Position setzen'}
        </button>
      </div>

      <ul className="list">
        {baseStations.map((station) => (
          <li key={station.id}>
            <strong>{station.name}</strong>
            <span className="mono">
              {station.position.lat.toFixed(4)} / {station.position.lng.toFixed(4)}
            </span>
          </li>
        ))}
        {baseStations.length === 0 && <li className="muted">Noch keine Stationen</li>}
      </ul>
    </div>
  );
}
