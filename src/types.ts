import { LatLngLiteral } from 'leaflet';
import { BaseStation } from './App';

export type EmployeeLocation = {
  position: LatLngLiteral;
  estimatedError: number;
  usedStations: Array<BaseStation & { distance: number }>;
};
