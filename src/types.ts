import { LatLngLiteral } from 'leaflet';

export type ConstructionSite = {
  id: string;
  name: string;
  center: LatLngLiteral;
  city?: string;
};

export type BaseStation = {
  id: string;
  name: string;
  position: LatLngLiteral;
  siteId: string;
  coverageMeters?: number;
};

export type Beacon = {
  id: string;
  label: string;
  worker: string;
  siteId: string;
  distances: Record<string, number>;
  timeStartedAt?: number;
  activeBaseStationId?: string;
  totalMs: number;
};

export type EmployeeLocation = {
  position: LatLngLiteral;
  estimatedError: number;
  usedStations: Array<BaseStation & { distance: number }>;
};
