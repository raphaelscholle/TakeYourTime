import { BaseStation, Employee } from '../types';

export const sampleBaseStations: BaseStation[] = [
  {
    id: 'beacon-east',
    name: 'Beacon Ost',
    position: { lat: 48.1375, lng: 11.6004 },
  },
  {
    id: 'beacon-west',
    name: 'Beacon West',
    position: { lat: 48.1341, lng: 11.561 },
  },
  {
    id: 'beacon-south',
    name: 'Beacon Süd',
    position: { lat: 48.1277, lng: 11.5821 },
  },
  {
    id: 'beacon-north',
    name: 'Beacon Nord',
    position: { lat: 48.1452, lng: 11.5794 },
  },
];

export const sampleEmployees: Employee[] = [
  {
    id: 'anna',
    name: 'Anna Bauer',
    distances: {
      'beacon-east': 900,
      'beacon-west': 1200,
      'beacon-south': 800,
      'beacon-north': 1100,
    },
    totalMs: 0,
  },
  {
    id: 'ben',
    name: 'Ben Fischer',
    distances: {
      'beacon-east': 450,
      'beacon-west': 950,
      'beacon-south': 700,
    },
    totalMs: 0,
  },
  {
    id: 'carla',
    name: 'Carla Vogel',
    distances: {
      'beacon-east': 700,
      'beacon-west': 600,
      'beacon-south': 1000,
      'beacon-north': 850,
    },
    totalMs: 0,
  },
];
