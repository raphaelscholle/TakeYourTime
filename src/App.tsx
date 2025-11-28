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
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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
  const activeTimers = useMemo(() => siteBeacons.filter((emp) => emp.timeStartedAt).length, [siteBeacons]);

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
        const visits = beacon.visits ?? [];
        const now = Date.now();
        const isLeavingSameStation = beacon.activeBaseStationId === baseStationId;
        const elapsed = beacon.timeStartedAt ? now - beacon.timeStartedAt : 0;

        const closeVisit = (stationId: string, currentVisits: typeof visits) => {
          const idx = currentVisits.findIndex((visit) => visit.stationId === stationId && !visit.endedAt);
          if (idx === -1) return currentVisits;
          const visit = currentVisits[idx];
          const updated = [...currentVisits];
          updated[idx] = {
            ...visit,
            endedAt: now,
            durationMs: (visit.durationMs ?? 0) + Math.max(0, now - visit.startedAt),
          };
          return updated;
        };

        if (isLeavingSameStation) {
          return {
            ...beacon,
            activeBaseStationId: undefined,
            timeStartedAt: undefined,
            totalMs: beacon.totalMs + elapsed,
            visits: closeVisit(baseStationId, visits),
          };
        }

        if (beacon.activeBaseStationId) {
          const closedVisits = closeVisit(beacon.activeBaseStationId, visits);
          return {
            ...beacon,
            activeBaseStationId: baseStationId,
            timeStartedAt: now,
            totalMs: beacon.totalMs + elapsed,
            visits: [...closedVisits, { stationId: baseStationId, startedAt: now }],
          };
        }

        return {
          ...beacon,
          activeBaseStationId: baseStationId,
          timeStartedAt: now,
          totalMs: beacon.totalMs + (beacon.timeStartedAt ? elapsed : 0),
          visits: [...visits, { stationId: baseStationId, startedAt: now }],
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
            Fokus auf Zeiterfassung: Aufenthaltszeiten in Sichtweite aller Basestations nachvollziehen,
            pro Station die Dauer dokumentieren und den Verlauf transparent halten. Die Karte bleibt als
            visuelle Ergänzung erhalten.
          </p>
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
            clock={clock}
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

      {selectedBeacon && (
        <footer className="footer">
          <div>
            <strong>{selectedBeacon.worker}</strong> · {selectedBeacon.label}
            <div className="time">
              Aufenthalt gesamt:{' '}
              {formatMillis(
                selectedBeacon.totalMs +
                  (selectedBeacon.timeStartedAt ? clock - selectedBeacon.timeStartedAt : 0)
              )}
            </div>
          </div>
          <div className="pill subtle">
            {selectedBeacon.activeBaseStationId
              ? `Im Bereich von ${siteBaseStations.find((s) => s.id === selectedBeacon.activeBaseStationId)?.name ?? 'Station'}`
              : 'Aktuell außerhalb aller Zonen'}
          </div>
        </footer>
      )}
    </div>
  );
}
