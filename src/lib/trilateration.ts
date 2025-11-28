import { LatLngLiteral } from 'leaflet';
import { BaseStation } from '../App';
import { EmployeeLocation } from '../types';

const earthRadius = 6371000; // meters

function toXY(ref: LatLngLiteral, point: LatLngLiteral) {
  const latRad = (point.lat * Math.PI) / 180;
  const lonRad = (point.lng * Math.PI) / 180;
  const refLat = (ref.lat * Math.PI) / 180;
  const refLon = (ref.lng * Math.PI) / 180;

  const x = (lonRad - refLon) * Math.cos((latRad + refLat) / 2) * earthRadius;
  const y = (latRad - refLat) * earthRadius;
  return { x, y };
}

function toLatLng(ref: LatLngLiteral, x: number, y: number): LatLngLiteral {
  const refLat = (ref.lat * Math.PI) / 180;
  const refLon = (ref.lng * Math.PI) / 180;

  const lat = refLat + y / earthRadius;
  const lon = refLon + x / (earthRadius * Math.cos((lat + refLat) / 2));

  return {
    lat: (lat * 180) / Math.PI,
    lng: (lon * 180) / Math.PI,
  };
}

export function calculateTrilateration(
  stations: Array<BaseStation & { distance: number }>
): EmployeeLocation {
  if (stations.length < 3) {
    throw new Error('Mindestens drei Stationen werden für eine Triangulation benötigt');
  }

  const reference = stations[0].position;
  const anchors = stations.map((station) => ({
    station,
    coords: toXY(reference, station.position),
  }));

  // linear least squares: 2(xi - x1)X + 2(yi - y1)Y = di^2 - d1^2 - (xi^2 - x1^2) - (yi^2 - y1^2)
  const a11 = anchors.slice(1).reduce((sum, { coords }) => sum + 2 * (coords.x - anchors[0].coords.x) ** 2, 0);
  const a22 = anchors.slice(1).reduce((sum, { coords }) => sum + 2 * (coords.y - anchors[0].coords.y) ** 2, 0);
  const a12 = anchors
    .slice(1)
    .reduce((sum, { coords }) => sum + 4 * (coords.x - anchors[0].coords.x) * (coords.y - anchors[0].coords.y), 0);

  let b1 = 0;
  let b2 = 0;

  anchors.slice(1).forEach(({ station, coords }) => {
    const lhs = station.distance ** 2 - anchors[0].station.distance ** 2;
    const rhs = coords.x ** 2 - anchors[0].coords.x ** 2 + coords.y ** 2 - anchors[0].coords.y ** 2;
    b1 += (lhs - rhs) * (coords.x - anchors[0].coords.x);
    b2 += (lhs - rhs) * (coords.y - anchors[0].coords.y);
  });

  const det = a11 * a22 - a12 ** 2;
  const x = det !== 0 ? (a22 * b1 - a12 * b2) / det : anchors[0].coords.x;
  const y = det !== 0 ? (a11 * b2 - a12 * b1) / det : anchors[0].coords.y;

  const position = toLatLng(reference, x, y);

  const averageError = anchors.reduce((sum, entry) => {
    const dx = x - entry.coords.x;
    const dy = y - entry.coords.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const error = Math.abs(distance - entry.station.distance);
    return sum + error;
  }, 0);

  return {
    position,
    usedStations: stations,
    estimatedError: averageError / anchors.length,
  };
}
