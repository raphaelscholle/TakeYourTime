import { LatLngLiteral } from 'leaflet';

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

export type EmployeeLocation = {
  position: LatLngLiteral;
  estimatedError: number;
  usedStations: Array<BaseStation & { distance: number }>;
};
