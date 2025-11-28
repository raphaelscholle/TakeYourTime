import { BaseStation, LatLng, MqttBroker } from '../types';

export type CreateBrokerPayload = {
  name: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
};

export type CreateBasestationPayload = {
  name: string;
  deviceId?: string;
  siteId?: string;
  location: LatLng;
  coverageMeters?: number;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function fetchBrokers(apiBaseUrl: string): Promise<MqttBroker[]> {
  const response = await fetch(`${apiBaseUrl}/api/mqtt-brokers`);
  const data = await handleResponse<{ brokers: MqttBroker[] }>(response);
  return data.brokers;
}

export async function createBroker(
  apiBaseUrl: string,
  payload: CreateBrokerPayload
): Promise<MqttBroker> {
  const response = await fetch(`${apiBaseUrl}/api/mqtt-brokers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MqttBroker>(response);
}

export async function createBasestation(
  apiBaseUrl: string,
  brokerId: string,
  payload: CreateBasestationPayload
): Promise<BaseStation> {
  const response = await fetch(`${apiBaseUrl}/api/mqtt-brokers/${brokerId}/basestations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<BaseStation>(response);
}
