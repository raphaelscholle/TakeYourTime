import { useMemo, useState } from 'react';
import { BaseStation, Beacon } from '../types';

interface Props {
  baseStations: BaseStation[];
  beacons: Beacon[];
  selectedBeaconId?: string;
  onSelectBeacon: (id: string) => void;
  onBeaconCreate: (worker: string, label: string) => void;
  onDistanceChange: (beaconId: string, baseStationId: string, distance: number) => void;
  onTriangulate: (beaconId: string) => void;
  onToggleRange: (beaconId: string, baseStationId: string) => void;
}

export function BeaconPanel({
  baseStations,
  beacons,
  selectedBeaconId,
  onSelectBeacon,
  onBeaconCreate,
  onDistanceChange,
  onTriangulate,
  onToggleRange,
}: Props) {
  const [workerName, setWorkerName] = useState('');
  const [beaconLabel, setBeaconLabel] = useState('');

  const selectedBeacon = useMemo(
    () => beacons.find((beacon) => beacon.id === selectedBeaconId),
    [beacons, selectedBeaconId]
  );

  const handleAddBeacon = () => {
    if (!workerName.trim() || !beaconLabel.trim()) return;
    onBeaconCreate(workerName.trim(), beaconLabel.trim());
    setWorkerName('');
    setBeaconLabel('');
  };

  return (
    <div className="card">
      <div className="employee-header">
        <h2>BLE-Beacons &amp; Arbeiter · Debug</h2>
        <div className="form-row">
          <input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="Name des Mitarbeiters"
          />
          <input
            value={beaconLabel}
            onChange={(e) => setBeaconLabel(e.target.value)}
            placeholder="Beacon-ID"
          />
          <button
            type="button"
            onClick={handleAddBeacon}
            disabled={!workerName.trim() || !beaconLabel.trim()}
          >
            Beacon koppeln
          </button>
        </div>
      </div>

      <div className="employee-list">
        {beacons.map((beacon) => {
          const isActive = beacon.id === selectedBeaconId;
          const activeCount = Object.keys(beacon.activeStations ?? {}).length;
          return (
            <div
              key={beacon.id}
              className={`employee ${isActive ? 'active' : ''}`}
              onClick={() => onSelectBeacon(beacon.id)}
            >
              <div className="employee-meta">
                <div className="employee-line">
                  <span className={`status-dot ${activeCount ? 'success' : ''}`} />
                  <strong>{beacon.worker}</strong>
                  <span className="pill subtle">{beacon.label}</span>
                </div>
                <div className="muted small">
                  {Object.keys(beacon.distances).length} Distanzmessungen ·{' '}
                  {activeCount
                    ? `In Reichweite von ${activeCount} Station${activeCount === 1 ? '' : 'en'}`
                    : 'Bereit zum Scan'}
                </div>
              </div>
            </div>
          );
        })}
        {beacons.length === 0 && <p className="muted">Keine Beacons erfasst.</p>}
      </div>

      {selectedBeacon && (
        <div className="card nested">
          <h3>Signalbereich für {selectedBeacon.worker}</h3>
          {baseStations.length === 0 && (
            <p className="muted">Stationen hinzufügen, um Distanzen zu erfassen.</p>
          )}

          {baseStations.map((station) => (
            <div className="form-row" key={station.id}>
              <label>
                {station.name}
                <span className="muted mono small"> · {station.coverageMeters ?? 120} m Radius</span>
              </label>
              <span className="pill subtle">
                {selectedBeacon.activeStations?.[station.id]
                  ? 'in Reichweite'
                  : 'außerhalb'}
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Entfernung in Metern"
                value={selectedBeacon.distances[station.id] ?? ''}
                onChange={(e) => onDistanceChange(selectedBeacon.id, station.id, Number(e.target.value))}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => onToggleRange(selectedBeacon.id, station.id)}
              >
                {selectedBeacon.activeStations?.[station.id] ? 'Bereich verlassen' : 'Im Bereich'}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onTriangulate(selectedBeacon.id)}
            disabled={Object.keys(selectedBeacon.distances).length < 3}
          >
            Position triangulieren
          </button>
        </div>
      )}
    </div>
  );
}
