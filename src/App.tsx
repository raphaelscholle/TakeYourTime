import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { BaseStation, Beacon, EmployeeLocation } from './types';
import { calculateTrilateration } from './lib/trilateration';
import { sampleBaseStations, sampleBeacons, sampleConstructionSites } from './lib/sampleData';
import { formatMillis } from './lib/time';

const defaultCenter: LatLngExpression = [48.1351, 11.582];
const breakStations = new Set(['munich-break', 'augsburg-break']);

const baseIcon = new Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const peopleIcon = new Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077012.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function formatTime(value: number | undefined) {
  if (!value) return '–';
  return new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function sortVisits(beacon: Beacon) {
  return [...(beacon.visits ?? [])].sort((a, b) => a.startedAt - b.startedAt);
}

export default function App() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(
    sampleConstructionSites[0]?.id
  );
  const [baseStations] = useState<BaseStation[]>(sampleBaseStations);
  const [beacons] = useState<Beacon[]>(sampleBeacons);
  const [beaconLocations, setBeaconLocations] = useState<Record<string, EmployeeLocation | undefined>>({});
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | undefined>(
    sampleBeacons[0]?.id
  );

  const currentSite = useMemo(
    () => sampleConstructionSites.find((site) => site.id === selectedSiteId),
    [selectedSiteId]
  );

  const siteBaseStations = useMemo(
    () => baseStations.filter((station) => station.siteId === selectedSiteId),
    [baseStations, selectedSiteId]
  );

  const siteBeacons = useMemo(
    () => beacons.filter((beacon) => beacon.siteId === selectedSiteId),
    [beacons, selectedSiteId]
  );

  useEffect(() => {
    if (!selectedSiteId) return;
    setSelectedBeaconId((prev) =>
      siteBeacons.some((beacon) => beacon.id === prev) ? prev : siteBeacons[0]?.id
    );
  }, [selectedSiteId, siteBeacons]);

  const stationNameById = useMemo(() => {
    const map: Record<string, string> = {};
    baseStations.forEach((station) => {
      map[station.id] = station.name;
    });
    return map;
  }, [baseStations]);

  useEffect(() => {
    const updatedLocations: Record<string, EmployeeLocation | undefined> = {};

    beacons.forEach((beacon) => {
      const usableBaseStations = Object.entries(beacon.distances)
        .map(([stationId, distance]) => {
          const station = baseStations.find((b) => b.id === stationId);
          if (!station || station.siteId !== beacon.siteId || !Number.isFinite(distance)) return undefined;
          return { ...station, distance };
        })
        .filter(Boolean) as Array<BaseStation & { distance: number }>;

      if (usableBaseStations.length < 3) return;
      updatedLocations[beacon.id] = calculateTrilateration(usableBaseStations);
    });

    setBeaconLocations(updatedLocations);
  }, [baseStations, beacons]);

  const beaconSummaries = useMemo(
    () =>
      siteBeacons.map((beacon) => {
        const visits = sortVisits(beacon);
        const totalMs = visits.reduce(
          (sum, visit) => sum + (visit.durationMs ?? Math.max(0, (visit.endedAt ?? visit.startedAt) - visit.startedAt)),
          0
        );
        const breakMs = visits
          .filter((visit) => visit.kind === 'break' || breakStations.has(visit.stationId))
          .reduce(
            (sum, visit) => sum + (visit.durationMs ?? Math.max(0, (visit.endedAt ?? visit.startedAt) - visit.startedAt)),
            0
          );
        const workMs = totalMs - breakMs;
        const firstStart = visits[0]?.startedAt;
        const lastVisit = visits[visits.length - 1];
        const lastEnd = lastVisit?.endedAt ?? lastVisit?.startedAt;

        return {
          beacon,
          visits,
          totalMs,
          breakMs,
          workMs,
          firstStart,
          lastEnd,
        };
      }),
    [siteBeacons]
  );

  const selectedBeaconSummary = useMemo(
    () => beaconSummaries.find((summary) => summary.beacon.id === selectedBeaconId) ?? beaconSummaries[0],
    [beaconSummaries, selectedBeaconId]
  );

  const totalOnSite = beaconSummaries.reduce((sum, entry) => sum + entry.totalMs, 0);
  const totalBreak = beaconSummaries.reduce((sum, entry) => sum + entry.breakMs, 0);

  return (
    <div className="page">
      <header className="header">
        <div className="hero">
          <p className="eyebrow">Workday Replay</p>
          <div className="header-row">
            <h1>Personen &amp; Wege auf der Baustelle</h1>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="pill outline"
            >
              {sampleConstructionSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                  {site.city ? ` · ${site.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="subtitle">
            Ein kompakter Tagesüberblick mit Aufenthaltszeit, Pausen und der zuletzt bekannten Position
            je Person. Die Karte visualisiert die berechneten Positionen ohne zusätzliche Debug-Elemente.
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Personen</p>
            <p className="stat-value">{siteBeacons.length}</p>
            <span className="pill subtle">auf {currentSite?.name ?? '–'}</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Zeit vor Ort</p>
            <p className="stat-value">{formatMillis(totalOnSite)}</p>
            <span className="pill subtle">Summe aller Aufenthalte</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Pausen</p>
            <p className="stat-value">{formatMillis(totalBreak)}</p>
            <span className="pill subtle">gekennzeichnete Ruhezeiten</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Basistationen</p>
            <p className="stat-value">{siteBaseStations.length}</p>
            <span className="pill subtle">für Standort-Berechnung</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="card">
            <div className="presence-header">
              <div>
                <p className="eyebrow">Tagesverlauf</p>
                <h3>Wer war wann vor Ort?</h3>
                <p className="muted small">
                  Kompakte Übersicht über Gesamtzeit, Pausen und die erste/letzte Anwesenheit.
                </p>
              </div>
            </div>

            <div className="timeline-list">
              {beaconSummaries.map((entry) => (
                <button
                  key={entry.beacon.id}
                  className={`timeline-row ${selectedBeaconId === entry.beacon.id ? 'active' : ''}`}
                  onClick={() => setSelectedBeaconId(entry.beacon.id)}
                >
                  <div className="timeline-person">
                    <strong>{entry.beacon.worker}</strong>
                    <span className="pill subtle">{entry.beacon.label}</span>
                    <div className="muted small">{formatTime(entry.firstStart)} – {formatTime(entry.lastEnd)}</div>
                  </div>
                  <div className="timeline-metrics">
                    <div>
                      <p className="muted small">Gesamtzeit</p>
                      <strong>{formatMillis(entry.totalMs)}</strong>
                    </div>
                    <div>
                      <p className="muted small">Pausen</p>
                      <strong className="break-text">{formatMillis(entry.breakMs)}</strong>
                    </div>
                    <div>
                      <p className="muted small">Arbeitszeit</p>
                      <strong>{formatMillis(entry.workMs)}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedBeaconSummary && (
            <div className="card nested">
              <div className="presence-header">
                <div>
                  <p className="eyebrow">Details</p>
                  <h3>{selectedBeaconSummary.beacon.worker}</h3>
                  <p className="muted small">
                    Alle Aufenthaltsphasen inklusive Pausen. Zeiten beziehen sich auf den Beispieltag.
                  </p>
                </div>
                <span className="pill subtle">{selectedBeaconSummary.beacon.label}</span>
              </div>

              <ul className="visit-list compact">
                {selectedBeaconSummary.visits.map((visit, index) => (
                  <li key={`${visit.stationId}-${visit.startedAt}-${index}`} className="visit-row">
                    <div className="visit-person">
                      <div className="visit-line">
                        <strong>{stationNameById[visit.stationId] ?? visit.stationId}</strong>
                        {visit.kind === 'break' && <span className="pill outline">Pause</span>}
                      </div>
                      <div className="muted small">
                        {formatTime(visit.startedAt)} – {formatTime(visit.endedAt ?? visit.startedAt)}
                      </div>
                    </div>
                    <div className="visit-duration">
                      {formatMillis(
                        visit.durationMs ?? Math.max(0, (visit.endedAt ?? visit.startedAt) - visit.startedAt)
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="map-shell">
          <div className="map-header">
            <div>
              <p className="eyebrow">Karte</p>
              <h3>Letzte Positionen</h3>
              <p className="muted">
                Berechnete Aufenthaltsorte je Person. Basistationen bleiben als Orientierung sichtbar,
                alle Debug-Eingaben wurden ausgeblendet.
              </p>
            </div>
            <div className="chip-group">
              <span className="pill subtle">OpenStreetMap Layer</span>
            </div>
          </div>

          <div className="map">
            <MapContainer
              center={currentSite?.center ?? defaultCenter}
              zoom={13}
              scrollWheelZoom
              style={{ height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {siteBaseStations.map((station) => (
                <Marker key={station.id} position={station.position} icon={baseIcon}>
                  <Popup>
                    <strong>{station.name}</strong>
                    <br />
                    {station.position.lat.toFixed(5)}, {station.position.lng.toFixed(5)}
                  </Popup>
                </Marker>
              ))}

              {Object.entries(beaconLocations)
                .filter(([beaconId]) => siteBeacons.some((b) => b.id === beaconId))
                .map(([beaconId, location]) => {
                  if (!location) return null;
                  const beacon = beacons.find((b) => b.id === beaconId);
                  if (!beacon) return null;

                  return (
                    <Marker key={beaconId} position={location.position} icon={peopleIcon}>
                      <Popup>
                        <strong>{beacon.worker}</strong>
                        <br />
                        Beacon: {beacon.label}
                        <br />
                        Aufenthaltszeit: {
                          formatMillis(
                            beaconSummaries.find((summary) => summary.beacon.id === beaconId)?.totalMs ?? 0
                          )
                        }
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
