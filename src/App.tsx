import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression, LatLngLiteral } from 'leaflet';
import { formatDuration, intervalToDuration } from 'date-fns';
import { BaseStationForm } from './components/BaseStationForm';
import { EmployeePanel } from './components/EmployeePanel';
import { BaseStation, Employee, EmployeeLocation } from './types';
import { calculateTrilateration } from './lib/trilateration';
import { sampleBaseStations, sampleEmployees } from './lib/sampleData';

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

function formatMillis(ms: number) {
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, { delimiter: ', ' }) || '0 Sekunden';
}

export default function App() {
  const [baseStations, setBaseStations] = useState<BaseStation[]>(sampleBaseStations);
  const [placementMode, setPlacementMode] = useState<boolean>(false);
  const [pendingStationName, setPendingStationName] = useState('');
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(sampleEmployees[0]?.id);
  const [employeeLocations, setEmployeeLocations] = useState<Record<string, EmployeeLocation | undefined>>({});

  const activeLocations = useMemo(() => Object.entries(employeeLocations), [employeeLocations]);
  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
  const totalDistanceEntries = useMemo(
    () => employees.reduce((sum, emp) => sum + Object.keys(emp.distances).length, 0),
    [employees]
  );
  const triangulatedCount = useMemo(
    () => activeLocations.filter(([, location]) => Boolean(location)).length,
    [activeLocations]
  );
  const activeTimers = useMemo(() => employees.filter((emp) => emp.timeStartedAt).length, [employees]);

  const handlePlacementClick = (coords: LatLngLiteral) => {
    if (!placementMode || !pendingStationName.trim()) return;

    const newStation: BaseStation = {
      id: crypto.randomUUID(),
      name: pendingStationName.trim(),
      position: coords,
    };

    setBaseStations((prev) => [...prev, newStation]);
    setPlacementMode(false);
    setPendingStationName('');
  };

  const upsertDistance = (employeeId: string, baseStationId: string, distance: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? { ...emp, distances: { ...emp.distances, [baseStationId]: distance } }
          : emp
      )
    );
  };

  const upsertEmployee = (name: string) => {
    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      name: name.trim(),
      distances: {},
      totalMs: 0,
    };
    setEmployees((prev) => [...prev, newEmployee]);
    setSelectedEmployeeId(newEmployee.id);
  };

  const handleTimeToggle = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        if (emp.timeStartedAt) {
          const elapsed = Date.now() - emp.timeStartedAt;
          return { ...emp, timeStartedAt: undefined, totalMs: emp.totalMs + elapsed };
        }

        return { ...emp, timeStartedAt: Date.now() };
      })
    );
  };

  const computeEmployeeLocation = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const usableBaseStations = Object.entries(employee.distances)
      .map(([stationId, distance]) => {
        const station = baseStations.find((b) => b.id === stationId);
        if (!station || !Number.isFinite(distance)) return undefined;
        return { ...station, distance };
      })
      .filter(Boolean) as Array<BaseStation & { distance: number }>;

    if (usableBaseStations.length < 3) return;

    const estimated = calculateTrilateration(usableBaseStations);
    setEmployeeLocations((prev) => ({ ...prev, [employeeId]: estimated }));
  };

  useEffect(() => {
    employees.forEach((employee) => computeEmployeeLocation(employee.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, baseStations]);

  return (
    <div className="page">
      <header className="header">
        <div className="hero">
          <p className="eyebrow">Live Operations Cockpit</p>
          <div className="header-row">
            <h1>BLE-Triangulation</h1>
            <div className="chip-group">
              <span className={`pill outline ${placementMode ? 'success' : ''}`}>
                {placementMode ? 'Platzierungsmodus aktiv' : 'Platzierungsmodus aus'}
              </span>
              <span className="pill subtle">
                Aktiver Mitarbeiter: {selectedEmployee?.name ?? '–'}
              </span>
            </div>
          </div>
          <p className="subtitle">
            Basistationen setzen, BLE-Distanzen pflegen und Aufenthaltsdauer pro Mitarbeiter
            erfassen. Präzise Positionierung mit einem klaren, professionellen Control-Center.
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-label">Basistationen</p>
            <p className="stat-value">{baseStations.length}</p>
            <span className="pill subtle">auf der Karte platziert</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Mitarbeiter</p>
            <p className="stat-value">{employees.length}</p>
            <span className="pill subtle">inkl. Live-Timer: {activeTimers}</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Distanzmessungen</p>
            <p className="stat-value">{totalDistanceEntries}</p>
            <span className="pill subtle">für die Triangulation</span>
          </div>
          <div className="stat-card">
            <p className="stat-label">Trianguliert</p>
            <p className="stat-value">{triangulatedCount}</p>
            <span className="pill subtle">geschätzte Positionen</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <BaseStationForm
            baseStations={baseStations}
            placementMode={placementMode}
            pendingName={pendingStationName}
            onNameChange={setPendingStationName}
            onPlacementToggle={setPlacementMode}
          />

          <EmployeePanel
            baseStations={baseStations}
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
            onEmployeeCreate={upsertEmployee}
            onDistanceChange={upsertDistance}
            onTriangulate={computeEmployeeLocation}
            onToggleTimer={handleTimeToggle}
          />
        </section>

        <section className="map-shell">
          <div className="map-header">
            <div>
              <p className="eyebrow">Live-Karte</p>
              <h3>Triangulation &amp; Positionen</h3>
              <p className="muted">
                Präzise Karte mit OpenStreetMap-Basislayer. Im Platzierungsmodus einfach auf die Karte
                klicken, um neue Stationen zu setzen.
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
            <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom style={{ height: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {placementMode && pendingStationName && (
                <MapClickHandler onClick={handlePlacementClick} />
              )}

              {baseStations.map((station) => (
                <Marker key={station.id} position={station.position} icon={baseIcon}>
                  <Popup>
                    <strong>{station.name}</strong>
                    <br />
                    {station.position.lat.toFixed(5)}, {station.position.lng.toFixed(5)}
                  </Popup>
                </Marker>
              ))}

              {activeLocations.map(([empId, location]) => {
                if (!location) return null;
                const employee = employees.find((e) => e.id === empId);
                if (!employee) return null;

                return (
                  <Marker key={empId} position={location.position} icon={baseIcon}>
                    <Popup>
                      <strong>{employee.name}</strong>
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

      {selectedEmployee && (
        <footer className="footer">
          <div>
            <strong>{selectedEmployee.name}</strong>
            <div className="time">
              Aufenthalt gesamt: {formatMillis(selectedEmployee.totalMs + (selectedEmployee.timeStartedAt ? Date.now() - selectedEmployee.timeStartedAt : 0))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
