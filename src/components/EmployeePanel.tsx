import { useMemo, useState } from 'react';
import { BaseStation, Employee } from '../types';

interface Props {
  baseStations: BaseStation[];
  employees: Employee[];
  selectedEmployeeId?: string;
  onSelectEmployee: (id: string) => void;
  onEmployeeCreate: (name: string) => void;
  onDistanceChange: (employeeId: string, baseStationId: string, distance: number) => void;
  onTriangulate: (employeeId: string) => void;
  onToggleTimer: (employeeId: string) => void;
}

export function EmployeePanel({
  baseStations,
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  onEmployeeCreate,
  onDistanceChange,
  onTriangulate,
  onToggleTimer,
}: Props) {
  const [employeeName, setEmployeeName] = useState('');

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const handleAddEmployee = () => {
    if (!employeeName.trim()) return;
    onEmployeeCreate(employeeName.trim());
    setEmployeeName('');
  };

  return (
    <div className="card">
      <div className="employee-header">
        <h2>Mitarbeiter</h2>
        <div className="form-row">
          <input
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Name des Mitarbeiters"
          />
          <button type="button" onClick={handleAddEmployee} disabled={!employeeName.trim()}>
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="employee-list">
        {employees.map((employee) => {
          const isActive = employee.id === selectedEmployeeId;
          const isRunning = Boolean(employee.timeStartedAt);
          return (
            <div
              key={employee.id}
              className={`employee ${isActive ? 'active' : ''}`}
              onClick={() => onSelectEmployee(employee.id)}
            >
              <div>
                <strong>{employee.name}</strong>
                <div className="muted small">
                  {Object.keys(employee.distances).length} Distanzmessungen
                </div>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer(employee.id);
                }}
              >
                {isRunning ? 'Stop' : 'Start'}
              </button>
            </div>
          );
        })}
        {employees.length === 0 && <p className="muted">Keine Mitarbeiter erfasst.</p>}
      </div>

      {selectedEmployee && (
        <div className="card nested">
          <h3>BLE-Distanzen für {selectedEmployee.name}</h3>
          {baseStations.length === 0 && (
            <p className="muted">Stationen hinzufügen, um Distanzen zu erfassen.</p>
          )}

          {baseStations.map((station) => (
            <div className="form-row" key={station.id}>
              <label>{station.name}</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Entfernung in Metern"
                value={selectedEmployee.distances[station.id] ?? ''}
                onChange={(e) => onDistanceChange(selectedEmployee.id, station.id, Number(e.target.value))}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => onTriangulate(selectedEmployee.id)}
            disabled={Object.keys(selectedEmployee.distances).length < 3}
          >
            Position triangulieren
          </button>
        </div>
      )}
    </div>
  );
}
