import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression, LatLngLiteral } from 'leaflet';
import { BaseStationForm } from './components/BaseStationForm';
import { BeaconPanel } from './components/BeaconPanel';
import { BaseStation, Beacon, ConstructionSite, EmployeeLocation } from './types';
import { calculateTrilateration } from './lib/trilateration';
import { sampleBaseStations, sampleBeacons, sampleConstructionSites } from './lib/sampleData';
import { formatMillis } from './lib/time';

const defaultCenter: LatLngExpression = [48.1351, 11.582];

const baseIcon = new Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  onClick,
}: {
  onClick: (coords: LatLngLiteral) => void;
}) {
  useMapEvents({
    click: (evt) => {
      onClick({ lat: evt.latlng.lat, lng: evt.latlng.lng });
    },
  });

  return null;
}

export default function App() {
  const [constructionSites] = useState<ConstructionSite[]>(sampleConstructionSites);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(sampleConstructionSites[0]?.id);
  const [baseStations, setBaseStations] = useState<BaseStation[]>(sampleBaseStations);
  const [placementMode, setPlacementMode] = useState<boolean>(false);
  const [pendingStationName, setPendingStationName] = useState('');
  const [beacons, setBeacons] = useState<Beacon[]>(sampleBeacons);
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | undefined>(sampleBeacons[0]?.id);
  const [beaconLocations, setBeaconLocations] = useState<Record<string, EmployeeLocation | undefined>>({});
  const [now, setNow] = useState(Date.now());

  const currentSite = useMemo(
    () => constructionSites.find((site) => site.id === selectedSiteId),
    [constructionSites, selectedSiteId]
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
    if (!selectedSiteId || siteBeacons.some((b) => b.id === selectedBeaconId)) return;
    setSelectedBeaconId(siteBeacons[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, siteBeacons]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeLocations = useMemo(() => Object.entries(beaconLocations), [beaconLocations]);
  const selectedBeacon = beacons.find((emp) => emp.id === selectedBeaconId);
  const totalDistanceEntries = useMemo(
    () => siteBeacons.reduce((sum, emp) => sum + Object.keys(emp.distances).length, 0),
    [siteBeacons]
  );
  const triangulatedCount = useMemo(
    () =>
      activeLocations.filter(([beaconId, location]) =>
        Boolean(location) && siteBeacons.some((b) => b.id === beaconId)
      ).length,
    [activeLocations, siteBeacons]
  );
  const activeTimers = useMemo(
    () => siteBeacons.filter((emp) => Object.keys(emp.activeStations ?? {}).length > 0).length,
    [siteBeacons]
  );

  const getElapsedMs = (beacon: Beacon) =>
    beacon.totalMs + (beacon.presenceStartedAt ? now - beacon.presenceStartedAt : 0);

  const prioritizedBeacons = useMemo(
    () =>
      [...siteBeacons].sort((a, b) => {
        const aActive = Object.keys(a.activeStations ?? {}).length > 0;
        const bActive = Object.keys(b.activeStations ?? {}).length > 0;
        if (aActive !== bActive) return Number(bActive) - Number(aActive);
        return getElapsedMs(b) - getElapsedMs(a);
      }),
    [siteBeacons, now]
  );

  const stationNameById = useMemo(() => {
    const map: Record<string, string> = {};
    baseStations.forEach((station) => {
      map[station.id] = station.name;
    });
    return map;
  }, [baseStations]);

  const visitHistory = useMemo(
    () =>
      beacons
        .filter((beacon) => beacon.siteId === selectedSiteId)
        .flatMap((beacon) => {
          const pastVisits = (beacon.visits ?? []).map((visit, index) => ({
            key: `${beacon.id}-visit-${index}-${visit.startedAt}`,
            worker: beacon.worker,
            beaconLabel: beacon.label,
            stationName: stationNameById[visit.stationId] ?? visit.stationId,
            durationMs: visit.durationMs ?? Math.max(0, (visit.endedAt ?? now) - visit.startedAt),
            startedAt: visit.startedAt,
            endedAt: visit.endedAt,
            active: false,
          }));

          const activeVisits = Object.entries(beacon.activeStations ?? {}).map(
            ([stationId, startedAt]) => ({
              key: `${beacon.id}-active-${stationId}`,
              worker: beacon.worker,
              beaconLabel: beacon.label,
              stationName: stationNameById[stationId] ?? stationId,
              durationMs: Math.max(0, now - startedAt),
              startedAt,
              active: true,
            })
          );

          return [...pastVisits, ...activeVisits];
        })
        .sort((a, b) => b.startedAt - a.startedAt),
    [beacons, now, selectedSiteId, stationNameById]
  );

  const handlePlacementClick = (coords: LatLngLiteral) => {
    if (!placementMode || !pendingStationName.trim() || !selectedSiteId) return;

    const newStation: BaseStation = {
      id: crypto.randomUUID(),
      name: pendingStationName.trim(),
      position: coords,
      siteId: selectedSiteId,
    };

    setBaseStations((prev) => [...prev, newStation]);
    setPlacementMode(false);
    setPendingStationName('');
  };

  const upsertDistance = (beaconId: string, baseStationId: string, distance: number) => {
    setBeacons((prev) =>
      prev.map((beacon) =>
        beacon.id === beaconId
          ? { ...beacon, distances: { ...beacon.distances, [baseStationId]: distance } }
          : beacon
      )
    );
  };

  const upsertBeacon = (worker: string, label: string) => {
    const newBeacon: Beacon = {
      id: crypto.randomUUID(),
      label,
      worker,
      siteId: selectedSiteId ?? constructionSites[0]?.id ?? 'default-site',
      distances: {},
      activeStations: {},
      totalMs: 0,
      visits: [],
    };
    setBeacons((prev) => [...prev, newBeacon]);
    setSelectedBeaconId(newBeacon.id);
  };

  const toggleBeaconRange = (beaconId: string, baseStationId: string) => {
    setBeacons((prev) =>
      prev.map((beacon) => {
        if (beacon.id !== beaconId) return beacon;

        const now = Date.now();
        const activeStations = { ...(beacon.activeStations ?? {}) };
        const wasActive = Boolean(activeStations[baseStationId]);
        let presenceStartedAt = beacon.presenceStartedAt;
        let totalMs = beacon.totalMs;
        const visits = [...(beacon.visits ?? [])];

        if (wasActive) {
          const startedAt = activeStations[baseStationId] ?? now;
          const durationMs = Math.max(0, now - startedAt);
          delete activeStations[baseStationId];
          visits.push({ stationId: baseStationId, startedAt, endedAt: now, durationMs });

          if (Object.keys(activeStations).length === 0 && presenceStartedAt) {
            totalMs += now - presenceStartedAt;
            presenceStartedAt = undefined;
          }

          return {
            ...beacon,
            activeStations,
            presenceStartedAt,
            totalMs,
            visits,
          };
        }

        activeStations[baseStationId] = now;
        if (!presenceStartedAt) {
          presenceStartedAt = now;
        }

        return {
          ...beacon,
          activeStations,
          presenceStartedAt,
          totalMs,
          visits,
        };
      })
    );
  };

  const computeBeaconLocation = (beaconId: string) => {
    const beacon = beacons.find((b) => b.id === beaconId);
    if (!beacon) return;

    const usableBaseStations = Object.entries(beacon.distances)
      .map(([stationId, distance]) => {
        const station = baseStations.find((b) => b.id === stationId);
        if (!station || station.siteId !== beacon.siteId || !Number.isFinite(distance)) return undefined;
        return { ...station, distance };
      })
      .filter(Boolean) as Array<BaseStation & { distance: number }>;

    if (usableBaseStations.length < 3) return;

    const estimated = calculateTrilateration(usableBaseStations);
    setBeaconLocations((prev) => ({ ...prev, [beaconId]: estimated }));
  };

  useEffect(() => {
    beacons.forEach((beacon) => computeBeaconLocation(beacon.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beacons, baseStations]);

  return (
    <div className="page">
      <header className="header">
        <div className="hero">
          <p className="eyebrow">Live Operations Cockpit</p>
          <div className="header-row">
            <h1>BLE-Triangulation</h1>
            <div className="chip-group">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="pill outline"
              >
                {constructionSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.city ? ` · ${site.city}` : ''}
                  </option>
                ))}
              </select>
              <span className={`pill outline ${placementMode ? 'success' : ''}`}>
                {placementMode ? 'Platzierungsmodus aktiv' : 'Platzierungsmodus aus'}
              </span>
              <span className="pill subtle">
                Aktiver Beacon: {selectedBeacon?.label ?? '–'}
              </span>
            </div>
          </div>
          <p className="subtitle">
            Mehrere Baustellen mit eigenen Basistationen orchestrieren, BLE-Beacons koppeln und
            Aufenthaltszeiten automatisch erfassen sobald ein Worker in Reichweite kommt. Die
            Karte liefert Triangulation aus allen erreichbaren Stationen.
          </p>

          <div className="presence-strip">
            <div className="presence-header">
              <p className="eyebrow">Aufenthaltszeiten live</p>
              <p className="muted small">
                Jeder Mitarbeiter mit Beacon und aktuellem Aufenthaltsstatus, priorisiert nach
                aktiver Funkreichweite.
              </p>
            </div>
            <div className="presence-cards">
              {prioritizedBeacons.map((beacon) => {
                const activeStations = siteBaseStations.filter((s) =>
                  Boolean(beacon.activeStations?.[s.id])
                );
                return (
                  <div key={beacon.id} className="presence-card">
                    <div className="presence-line">
                      <strong>{beacon.worker}</strong>
                      <span className="pill subtle">{beacon.label}</span>
                    </div>
                    <p className="presence-metric">Aufenthalt gesamt: {formatMillis(getElapsedMs(beacon))}</p>
                    <p className="presence-status">
                      {activeStations.length
                        ? `Im Bereich von ${activeStations.map((s) => s.name).join(', ')}`
                        : 'Aktuell außerhalb aller Zonen'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Baustellen</p>
            <p className="stat-value">{constructionSites.length}</p>
            <span className="pill subtle">aktuell auswählbar</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Basistationen</p>
            <p className="stat-value">{siteBaseStations.length}</p>
            <span className="pill subtle">Standort: {currentSite?.name ?? '–'}</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Beacons</p>
            <p className="stat-value">{siteBeacons.length}</p>
            <span className="pill subtle">Live-Zeitnehmer: {activeTimers}</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Trianguliert</p>
            <p className="stat-value">{triangulatedCount}</p>
            <span className="pill subtle">auf Basis von {totalDistanceEntries} Messungen</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <BaseStationForm
            baseStations={siteBaseStations}
            siteName={currentSite?.name}
            placementMode={placementMode}
            pendingName={pendingStationName}
            onNameChange={setPendingStationName}
            onPlacementToggle={setPlacementMode}
          />

          <BeaconPanel
            baseStations={siteBaseStations}
            beacons={siteBeacons}
            selectedBeaconId={selectedBeaconId}
            onSelectBeacon={setSelectedBeaconId}
            onBeaconCreate={upsertBeacon}
            onDistanceChange={upsertDistance}
            onTriangulate={computeBeaconLocation}
            onToggleRange={toggleBeaconRange}
          />
        </section>

        <section className="map-shell">
          <div className="map-header">
            <div>
              <p className="eyebrow">Live-Karte</p>
              <h3>Triangulation &amp; Positionen</h3>
              <p className="muted">
                Präzise Karte mit OpenStreetMap-Basislayer pro Baustelle. Im Platzierungsmodus
                einfach auf die Karte klicken, um neue Stationen zu setzen.
              </p>
            </div>
            <div className="chip-group">
              <span className="pill subtle">OpenStreetMap Kartenmaterial</span>
              <span className={`pill outline ${placementMode ? 'success' : ''}`}>
                {placementMode ? 'Klicken zum Platzieren' : 'Platzierungsmodus deaktiviert'}
              </span>
            </div>
          </div>

          <div className="map">
            <MapContainer
              center={currentSite?.center ?? defaultCenter}
              zoom={12}
              scrollWheelZoom
              style={{ height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {placementMode && pendingStationName && (
                <MapClickHandler onClick={handlePlacementClick} />
              )}

              {siteBaseStations.map((station) => (
                <Marker key={station.id} position={station.position} icon={baseIcon}>
                  <Popup>
                    <strong>{station.name}</strong>
                    <br />
                    {station.position.lat.toFixed(5)}, {station.position.lng.toFixed(5)}
                    <br />
                    Radius: {station.coverageMeters ?? 120} m
                  </Popup>
                </Marker>
              ))}

              {activeLocations.map(([beaconId, location]) => {
                if (!location) return null;
                const beacon = beacons.find((b) => b.id === beaconId && b.siteId === selectedSiteId);
                if (!beacon) return null;

                return (
                  <Marker key={beaconId} position={location.position} icon={baseIcon}>
                    <Popup>
                      <strong>{beacon.worker}</strong>
                      <br />
                      Beacon: {beacon.label}
                      <br />Geschätzte Position aus {location.usedStations.length} Stationen
                      <br />
                      Distanzfehler: {location.estimatedError.toFixed(1)} m
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </section>
      </main>

      <section className="history-section">
        <div className="card history-card">
          <div className="history-heading">
            <div>
              <p className="eyebrow">Beacon &amp; Arbeiter Debug</p>
              <h3>Aufenthaltsprotokoll</h3>
              <p className="muted small">
                Mehrere Stationen können gleichzeitig im Empfang sein; hier siehst du die Stationen,
                Aufenthaltszeiten und laufende Sessions pro Person.
              </p>
            </div>
            <span className="pill outline">Fokus: Zeit im Bereich</span>
          </div>

          <ul className="visit-list">
            {visitHistory.map((entry) => (
              <li key={entry.key} className="visit-row">
                <div className="visit-person">
                  <div className="visit-line">
                    <strong>{entry.worker}</strong>
                    <span className="pill subtle">{entry.beaconLabel}</span>
                  </div>
                  <div className="muted small">Station: {entry.stationName}</div>
                </div>
                <div className="visit-duration">{formatMillis(entry.durationMs)}</div>
                <div className={`pill ${entry.active ? 'success' : 'subtle'}`}>
                  {entry.active ? 'live' : 'abgeschlossen'}
                </div>
              </li>
            ))}
            {visitHistory.length === 0 && <li className="muted">Noch keine Aufenthaltsdaten vorhanden.</li>}
          </ul>
        </div>
      </section>

      {selectedBeacon && (
        <footer className="footer">
          <div>
            <strong>{selectedBeacon.worker}</strong> · {selectedBeacon.label}
            <div className="time">
              Aufenthalt gesamt:{' '}
              {formatMillis(getElapsedMs(selectedBeacon))}
            </div>
          </div>
          <div className="pill subtle">
            {Object.keys(selectedBeacon.activeStations ?? {}).length
              ? `Im Bereich von ${siteBaseStations
                  .filter((s) => selectedBeacon.activeStations?.[s.id])
                  .map((s) => s.name)
                  .join(', ')}`
              : 'Aktuell außerhalb aller Zonen'}
          </div>
        </footer>
      )}
    </div>
  );
}
