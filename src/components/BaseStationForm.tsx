import { BaseStation } from '../types';

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

      <ul className="list station-list">
        {baseStations.map((station, index) => (
          <li key={station.id} className="list-tile">
            <div>
              <div className="list-title">{station.name}</div>
              <div className="muted mono small">
                {station.position.lat.toFixed(4)} / {station.position.lng.toFixed(4)}
              </div>
            </div>
            <span className="pill subtle">#{String(index + 1).padStart(2, '0')}</span>
          </li>
        ))}
        {baseStations.length === 0 && <li className="muted">Noch keine Stationen</li>}
      </ul>
    </div>
  );
}
