import { BaseStation, Beacon, ConstructionSite } from '../types';

export const sampleConstructionSites: ConstructionSite[] = [
  {
    id: 'site-munich',
    name: 'Baufeld München Nord',
    city: 'München',
    center: { lat: 48.1351, lng: 11.582 },
  },
  {
    id: 'site-augsburg',
    name: 'Logistikpark Augsburg',
    city: 'Augsburg',
    center: { lat: 48.365, lng: 10.894 },
  },
];

const baseDay = new Date('2024-05-06T06:00:00.000Z').getTime();

export const sampleBaseStations: BaseStation[] = [
  {
    id: 'beacon-east',
    name: 'Beacon Ost',
    position: { lat: 48.1375, lng: 11.6004 },
    siteId: 'site-munich',
    coverageMeters: 120,
  },
  {
    id: 'beacon-west',
    name: 'Beacon West',
    position: { lat: 48.1341, lng: 11.561 },
    siteId: 'site-munich',
    coverageMeters: 150,
  },
  {
    id: 'beacon-south',
    name: 'Beacon Süd',
    position: { lat: 48.1277, lng: 11.5821 },
    siteId: 'site-munich',
    coverageMeters: 140,
  },
  {
    id: 'beacon-north',
    name: 'Beacon Nord',
    position: { lat: 48.1452, lng: 11.5794 },
    siteId: 'site-munich',
    coverageMeters: 160,
  },
  {
    id: 'munich-break',
    name: 'Pausenfläche',
    position: { lat: 48.139, lng: 11.5878 },
    siteId: 'site-munich',
    coverageMeters: 80,
  },
  {
    id: 'augsburg-a',
    name: 'Tor A',
    position: { lat: 48.3705, lng: 10.8973 },
    siteId: 'site-augsburg',
    coverageMeters: 200,
  },
  {
    id: 'augsburg-b',
    name: 'Rampe B',
    position: { lat: 48.3612, lng: 10.8891 },
    siteId: 'site-augsburg',
    coverageMeters: 110,
  },
  {
    id: 'augsburg-c',
    name: 'Halle C',
    position: { lat: 48.3671, lng: 10.9034 },
    siteId: 'site-augsburg',
    coverageMeters: 140,
  },
  {
    id: 'augsburg-break',
    name: 'Kantine',
    position: { lat: 48.364, lng: 10.896 },
    siteId: 'site-augsburg',
    coverageMeters: 90,
  },
];

export const sampleBeacons: Beacon[] = [
  {
    id: 'anna',
    label: 'Beacon A-01',
    worker: 'Anna Bauer',
    siteId: 'site-munich',
    distances: {
      'beacon-east': 90,
      'beacon-west': 120,
      'beacon-south': 80,
      'beacon-north': 110,
      'munich-break': 140,
    },
    activeStations: {},
    totalMs: 8.75 * 60 * 60 * 1000,
    visits: [
      {
        stationId: 'beacon-east',
        startedAt: baseDay + 8 * 60 * 60 * 1000 + 5 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000 + 15 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'munich-break',
        startedAt: baseDay + 10 * 60 * 60 * 1000 + 15 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000 + 45 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'beacon-west',
        startedAt: baseDay + 10 * 60 * 60 * 1000 + 45 * 60 * 1000,
        endedAt: baseDay + 12 * 60 * 60 * 1000 + 30 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'munich-break',
        startedAt: baseDay + 12 * 60 * 60 * 1000 + 30 * 60 * 1000,
        endedAt: baseDay + 13 * 60 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'beacon-north',
        startedAt: baseDay + 13 * 60 * 60 * 1000,
        endedAt: baseDay + 16 * 60 * 60 * 1000 + 20 * 60 * 1000,
        kind: 'work',
      },
    ],
  },
  {
    id: 'ben',
    label: 'Beacon B-12',
    worker: 'Ben Fischer',
    siteId: 'site-munich',
    distances: {
      'beacon-east': 45,
      'beacon-west': 95,
      'beacon-south': 70,
      'munich-break': 100,
    },
    activeStations: {},
    totalMs: 8.25 * 60 * 60 * 1000,
    visits: [
      {
        stationId: 'beacon-south',
        startedAt: baseDay + 7 * 60 * 60 * 1000 + 50 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'munich-break',
        startedAt: baseDay + 10 * 60 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000 + 30 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'beacon-east',
        startedAt: baseDay + 10 * 60 * 60 * 1000 + 30 * 60 * 1000,
        endedAt: baseDay + 12 * 60 * 60 * 1000 + 10 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'munich-break',
        startedAt: baseDay + 12 * 60 * 60 * 1000 + 10 * 60 * 1000,
        endedAt: baseDay + 12 * 60 * 60 * 1000 + 50 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'beacon-west',
        startedAt: baseDay + 12 * 60 * 60 * 1000 + 50 * 60 * 1000,
        endedAt: baseDay + 16 * 60 * 60 * 1000 + 5 * 60 * 1000,
        kind: 'work',
      },
    ],
  },
  {
    id: 'carla',
    label: 'Beacon C-05',
    worker: 'Carla Vogel',
    siteId: 'site-augsburg',
    distances: {
      'augsburg-a': 60,
      'augsburg-b': 130,
      'augsburg-c': 90,
      'augsburg-break': 70,
    },
    activeStations: {},
    totalMs: 7.5 * 60 * 60 * 1000,
    visits: [
      {
        stationId: 'augsburg-a',
        startedAt: baseDay + 8 * 60 * 60 * 1000 + 10 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000 + 20 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'augsburg-break',
        startedAt: baseDay + 10 * 60 * 60 * 1000 + 20 * 60 * 1000,
        endedAt: baseDay + 10 * 60 * 60 * 1000 + 50 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'augsburg-c',
        startedAt: baseDay + 10 * 60 * 60 * 1000 + 50 * 60 * 1000,
        endedAt: baseDay + 12 * 60 * 60 * 1000 + 15 * 60 * 1000,
        kind: 'work',
      },
      {
        stationId: 'augsburg-break',
        startedAt: baseDay + 12 * 60 * 60 * 1000 + 15 * 60 * 1000,
        endedAt: baseDay + 12 * 60 * 60 * 1000 + 55 * 60 * 1000,
        kind: 'break',
      },
      {
        stationId: 'augsburg-b',
        startedAt: baseDay + 12 * 60 * 60 * 1000 + 55 * 60 * 1000,
        endedAt: baseDay + 15 * 60 * 60 * 1000 + 20 * 60 * 1000,
        kind: 'work',
      },
    ],
  },
];
