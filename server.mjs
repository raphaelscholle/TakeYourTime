import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const port = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json());

const mqttBrokers = new Map();

function validateLocation(location) {
  if (!location || typeof location !== 'object') return 'Missing location object';
  const { lat, lng } = location;
  if (typeof lat !== 'number' || Number.isNaN(lat) || lat < -90 || lat > 90)
    return 'Latitude must be a number between -90 and 90';
  if (typeof lng !== 'number' || Number.isNaN(lng) || lng < -180 || lng > 180)
    return 'Longitude must be a number between -180 and 180';
  return undefined;
}

app.get('/api/mqtt-brokers', (_req, res) => {
  res.json({ brokers: Array.from(mqttBrokers.values()).map((broker) => ({
    ...broker,
    basestations: broker.basestations ?? [],
  })) });
});

app.post('/api/mqtt-brokers', (req, res) => {
  const { name, host, port: brokerPort, username, password } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Broker name is required' });
  }
  if (!host || typeof host !== 'string') {
    return res.status(400).json({ error: 'Broker host is required' });
  }

  const id = randomUUID();
  const broker = {
    id,
    name,
    host,
    port: brokerPort ?? 1883,
    username: username ?? null,
    password: password ?? null,
    basestations: [],
  };

  mqttBrokers.set(id, broker);
  return res.status(201).json(broker);
});

app.get('/api/mqtt-brokers/:brokerId/basestations', (req, res) => {
  const broker = mqttBrokers.get(req.params.brokerId);
  if (!broker) {
    return res.status(404).json({ error: 'Broker not found' });
  }
  return res.json({ basestations: broker.basestations });
});

app.post('/api/mqtt-brokers/:brokerId/basestations', (req, res) => {
  const broker = mqttBrokers.get(req.params.brokerId);
  if (!broker) {
    return res.status(404).json({ error: 'Broker not found' });
  }

  const { name, deviceId, siteId, location, coverageMeters } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Basestation name is required' });
  }

  const locationError = validateLocation(location);
  if (locationError) {
    return res.status(400).json({ error: locationError });
  }

  const station = {
    id: randomUUID(),
    name,
    deviceId: deviceId ?? null,
    siteId: siteId ?? null,
    position: { lat: location.lat, lng: location.lng },
    coverageMeters: typeof coverageMeters === 'number' && coverageMeters > 0 ? coverageMeters : null,
    registeredAt: new Date().toISOString(),
  };

  broker.basestations.push(station);
  return res.status(201).json(station);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`);
});
