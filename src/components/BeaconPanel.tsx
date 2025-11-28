import { useMemo, useState } from 'react';
import { BaseStation, Beacon } from '../types';
import { formatMillis } from '../lib/time';

interface Props {
  baseStations: BaseStation[];
  beacons: Beacon[];
  selectedBeaconId?: string;
  clock: number;
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
  clock,
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

  const stationDurations = useMemo(() => {
    if (!selectedBeacon) return [];
    return baseStations.map((station) => {
      const totalMs = (selectedBeacon.visits ?? []).reduce((sum, visit) => {
        if (visit.stationId !== station.id) return sum;
        const duration = visit.durationMs ?? Math.max(0, (visit.endedAt ?? clock) - visit.startedAt);
        return sum + duration;
      }, 0);

      const liveAddition =
        selectedBeacon.activeBaseStationId === station.id && selectedBeacon.timeStartedAt
          ? Math.max(0, clock - selectedBeacon.timeStartedAt)
          : 0;

      return { station, totalMs: totalMs + liveAddition };
    });
  }, [baseStations, clock, selectedBeacon]);

  const visitTimeline = useMemo(() => {
    if (!selectedBeacon) return [];
    return [...(selectedBeacon.visits ?? [])].sort((a, b) => b.startedAt - a.startedAt);
  }, [selectedBeacon]);

  const formatTime = (value: number) =>
    new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(value);

  const handleAddBeacon = () => {
    if (!workerName.trim() || !beaconLabel.trim()) return;
    onBeaconCreate(workerName.trim(), beaconLabel.trim());
    setWorkerName('');
    setBeaconLabel('');
  };

  return (
    <div className="card">
      <div className="employee-header">
        <h2>BLE-Beacons &amp; Arbeiter</h2>
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
          const isRunning = Boolean(beacon.timeStartedAt);
          return (
            <div
              key={beacon.id}
              className={`employee ${isActive ? 'active' : ''}`}
              onClick={() => onSelectBeacon(beacon.id)}
            >
              <div className="employee-meta">
                <div className="employee-line">
                  <span className={`status-dot ${isRunning ? 'success' : ''}`} />
                  <strong>{beacon.worker}</strong>
                  <span className="pill subtle">{beacon.label}</span>
                </div>
                <div className="muted small">
                  {Object.keys(beacon.distances).length} Distanzmessungen ·{' '}
                  {isRunning
                    ? `In Reichweite von ${beacon.activeBaseStationId ?? 'Station'}`
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
          <p className="muted small">
            Fokus auf Aufenthaltsdauer: Zeiten pro Basestation erfassen und chronologisch nachvollziehen,
            wann {selectedBeacon.worker} wo anwesend war.
          </p>
          {baseStations.length === 0 && (
            <p className="muted">Stationen hinzufügen, um Distanzen zu erfassen.</p>
          )}

          {baseStations.map((station) => (
            <div className="form-row" key={station.id}>
              <label>
                {station.name}
                <span className="muted mono small"> · {station.coverageMeters ?? 120} m Radius</span>
              </label>
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
                {selectedBeacon.activeBaseStationId === station.id ? 'Bereich verlassen' : 'Im Bereich'}
              </button>
            </div>
          ))}

          <div className="duration-grid">
            {stationDurations.map(({ station, totalMs }) => (
              <div className="duration-card" key={station.id}>
                <div className="muted small">{station.name}</div>
                <div className="duration-value">{formatMillis(totalMs)}</div>
                {selectedBeacon.activeBaseStationId === station.id && (
                  <span className="pill subtle">gerade im Sichtfeld</span>
                )}
              </div>
            ))}
          </div>

          <div className="history-block">
            <div className="history-heading">
              <h4>Aufenthaltsverlauf</h4>
              <span className="pill outline">
                {visitTimeline.length} {visitTimeline.length === 1 ? 'Messung' : 'Messungen'}
              </span>
            </div>
            {visitTimeline.length === 0 && <p className="muted">Noch keine Aufenthalte erfasst.</p>}
            {visitTimeline.length > 0 && (
              <ul className="visit-list">
                {visitTimeline.map((visit, index) => {
                  const stationName =
                    baseStations.find((station) => station.id === visit.stationId)?.name ?? 'Station';
                  const duration = formatMillis(
                    visit.durationMs ?? Math.max(0, (visit.endedAt ?? clock) - visit.startedAt)
                  );
                  return (
                    <li className="visit-row" key={`${visit.stationId}-${visit.startedAt}-${index}`}>
                      <div>
                        <strong>{stationName}</strong>
                        <div className="muted small">
                          {formatTime(visit.startedAt)} – {visit.endedAt ? formatTime(visit.endedAt) : 'läuft'}
                        </div>
                      </div>
                      <span className="pill subtle">{duration}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

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
