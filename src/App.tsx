import { useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression, LatLngLiteral } from 'leaflet';
import { formatDuration, intervalToDuration } from 'date-fns';
import { BaseStationForm } from './components/BaseStationForm';
import { EmployeePanel } from './components/EmployeePanel';
import { EmployeeLocation } from './types';
import { calculateTrilateration } from './lib/trilateration';

const defaultCenter: LatLngExpression = [48.1351, 11.582];

export type BaseStation = {
  id: string;
  name: string;
  position: LatLngLiteral;
};

export type Employee = {
  id: string;
  name: string;
  distances: Record<string, number>;
  timeStartedAt?: number;
  totalMs: number;
};

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
  const [baseStations, setBaseStations] = useState<BaseStation[]>([]);
  const [placementMode, setPlacementMode] = useState<boolean>(false);
  const [pendingStationName, setPendingStationName] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [employeeLocations, setEmployeeLocations] = useState<Record<string, EmployeeLocation | undefined>>({});

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);

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

  const activeLocations = useMemo(() => Object.entries(employeeLocations), [employeeLocations]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>BLE-Triangulation</h1>
          <p className="subtitle">
            Basistationen setzen, BLE-Distanzen pflegen und Aufenthaltsdauer pro Mitarbeiter
            erfassen.
          </p>
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

        <section className="map">
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
