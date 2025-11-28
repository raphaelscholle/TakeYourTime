import { FormEvent, useMemo, useState } from 'react';
import { CreateBasestationPayload, CreateBrokerPayload } from '../lib/backend';
import { BaseStation, ConstructionSite, MqttBroker } from '../types';

interface Props {
  apiBaseUrl: string;
  brokers: MqttBroker[];
  sites: ConstructionSite[];
  selectedBrokerId?: string;
  statusMessage?: string;
  loading?: boolean;
  onApiBaseUrlChange: (value: string) => void;
  onSelectBroker: (id: string) => void;
  onRefresh: () => void;
  onCreateBroker: (payload: CreateBrokerPayload) => Promise<void>;
  onCreateBasestation: (payload: CreateBasestationPayload) => Promise<void>;
}

export function SettingsMenu({
  apiBaseUrl,
  brokers,
  sites,
  selectedBrokerId,
  statusMessage,
  loading,
  onApiBaseUrlChange,
  onSelectBroker,
  onRefresh,
  onCreateBroker,
  onCreateBasestation,
}: Props) {
  const [brokerForm, setBrokerForm] = useState<CreateBrokerPayload>({
    name: '',
    host: 'localhost',
    port: 1883,
    username: '',
    password: '',
  });
  const [stationForm, setStationForm] = useState<{
    name: string;
    siteId?: string;
    lat: number;
    lng: number;
    coverageMeters?: number;
    deviceId?: string;
  }>({
    name: '',
    siteId: sites[0]?.id,
    lat: 48.1351,
    lng: 11.582,
    coverageMeters: 120,
    deviceId: '',
  });
  const [busy, setBusy] = useState(false);
  const selectedBroker = useMemo(
    () => brokers.find((broker) => broker.id === selectedBrokerId),
    [brokers, selectedBrokerId]
  );

  const resetBrokerForm = () =>
    setBrokerForm({ name: '', host: 'localhost', port: 1883, username: '', password: '' });

  const resetStationForm = () =>
    setStationForm((prev) => ({
      ...prev,
      name: '',
      deviceId: '',
    }));

  const handleCreateBroker = async (event: FormEvent) => {
    event.preventDefault();
    if (!brokerForm.name.trim() || !brokerForm.host.trim()) return;
    setBusy(true);
    try {
      await onCreateBroker({
        ...brokerForm,
        username: brokerForm.username || undefined,
        password: brokerForm.password || undefined,
      });
      resetBrokerForm();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateBasestation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBroker?.id || !stationForm.name.trim()) return;
    setBusy(true);
    try {
      await onCreateBasestation({
        name: stationForm.name.trim(),
        location: { lat: Number(stationForm.lat), lng: Number(stationForm.lng) },
        coverageMeters: stationForm.coverageMeters ? Number(stationForm.coverageMeters) : undefined,
        deviceId: stationForm.deviceId?.trim() || undefined,
        siteId: stationForm.siteId,
      });
      resetStationForm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="settings-panel">
      <div className="settings-row">
        <div>
          <p className="eyebrow">Backend</p>
          <h3>API &amp; Sensorverwaltung</h3>
          <p className="muted small">
            Verwalte MQTT-Broker und Basistationen über den lokalen API-Server. Alle Änderungen werden direkt
            an das Backend geschickt.
          </p>
        </div>
        <button className="secondary" type="button" onClick={onRefresh} disabled={loading}>
          Neu laden
        </button>
      </div>

      <label className="stacked">
        <span className="muted small">API-URL</span>
        <input
          value={apiBaseUrl}
          onChange={(e) => onApiBaseUrlChange(e.target.value)}
          placeholder="http://localhost:4000"
        />
      </label>

      {statusMessage && <div className="hint info">{statusMessage}</div>}

      <div className="settings-grid">
        <form className="settings-card" onSubmit={handleCreateBroker}>
          <div className="card-header">
            <div>
              <p className="eyebrow">MQTT</p>
              <h4>Broker anlegen</h4>
            </div>
            <span className="pill subtle">Port {brokerForm.port ?? 1883}</span>
          </div>
          <div className="stacked">
            <label className="muted small">Name</label>
            <input
              value={brokerForm.name}
              onChange={(e) => setBrokerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="z. B. Baustelle Nord"
              required
            />
          </div>
          <div className="stacked">
            <label className="muted small">Host</label>
            <input
              value={brokerForm.host}
              onChange={(e) => setBrokerForm((prev) => ({ ...prev, host: e.target.value }))}
              placeholder="localhost"
              required
            />
          </div>
          <div className="inline-fields">
            <label className="stacked">
              <span className="muted small">Port</span>
              <input
                type="number"
                min="1"
                max="65535"
                value={brokerForm.port ?? ''}
                onChange={(e) => setBrokerForm((prev) => ({ ...prev, port: Number(e.target.value) }))}
              />
            </label>
            <label className="stacked">
              <span className="muted small">Benutzername</span>
              <input
                value={brokerForm.username ?? ''}
                onChange={(e) => setBrokerForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="optional"
              />
            </label>
            <label className="stacked">
              <span className="muted small">Passwort</span>
              <input
                type="password"
                value={brokerForm.password ?? ''}
                onChange={(e) => setBrokerForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="optional"
              />
            </label>
          </div>
          <button type="submit" disabled={busy}>
            Broker speichern
          </button>
        </form>

        <div className="settings-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Sensoren</p>
              <h4>Basestationen konfigurieren</h4>
            </div>
            <span className="pill subtle">{brokers.length} Broker</span>
          </div>

          <div className="stacked">
            <label className="muted small">Broker wählen</label>
            <select
              value={selectedBrokerId ?? ''}
              onChange={(e) => onSelectBroker(e.target.value)}
              disabled={brokers.length === 0}
            >
              <option value="" disabled>
                Bitte Broker auswählen
              </option>
              {brokers.map((broker) => (
                <option key={broker.id} value={broker.id}>
                  {broker.name} · {broker.host}:{broker.port}
                </option>
              ))}
            </select>
          </div>

          <div className="hint">
            Sensoren werden als Basestationen gespeichert und dem ausgewählten Broker zugeordnet.
          </div>

          <form className="stacked" onSubmit={handleCreateBasestation}>
            <label className="muted small">Bezeichnung</label>
            <input
              value={stationForm.name}
              onChange={(e) => setStationForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="z. B. Eingang Ost"
              required
            />
            <label className="muted small">Baustelle</label>
            <select
              value={stationForm.siteId ?? ''}
              onChange={(e) => setStationForm((prev) => ({ ...prev, siteId: e.target.value }))}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <div className="inline-fields">
              <label className="stacked">
                <span className="muted small">Breitengrad</span>
                <input
                  type="number"
                  step="0.00001"
                  value={stationForm.lat}
                  onChange={(e) => setStationForm((prev) => ({ ...prev, lat: Number(e.target.value) }))}
                  required
                />
              </label>
              <label className="stacked">
                <span className="muted small">Längengrad</span>
                <input
                  type="number"
                  step="0.00001"
                  value={stationForm.lng}
                  onChange={(e) => setStationForm((prev) => ({ ...prev, lng: Number(e.target.value) }))}
                  required
                />
              </label>
              <label className="stacked">
                <span className="muted small">Radius (m)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stationForm.coverageMeters ?? ''}
                  onChange={(e) =>
                    setStationForm((prev) => ({
                      ...prev,
                      coverageMeters: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </label>
            </div>

            <label className="stacked">
              <span className="muted small">Device-ID</span>
              <input
                value={stationForm.deviceId ?? ''}
                onChange={(e) => setStationForm((prev) => ({ ...prev, deviceId: e.target.value }))}
                placeholder="optional"
              />
            </label>

            <button type="submit" disabled={!selectedBroker || busy}>
              Sensor hinzufügen
            </button>
          </form>

          {selectedBroker && (
            <div className="station-list">
              <div className="card-header">
                <h5>Hinterlegte Sensoren</h5>
                <span className="pill subtle">{selectedBroker.basestations.length}</span>
              </div>
              {selectedBroker.basestations.length === 0 && (
                <p className="muted small">Noch keine Sensoren für diesen Broker gespeichert.</p>
              )}
              <ul className="list station-list">
                {selectedBroker.basestations.map((station: BaseStation) => (
                  <li key={station.id} className="list-tile">
                    <div>
                      <div className="list-title">{station.name}</div>
                      <div className="muted mono small">
                        {station.position.lat.toFixed(4)} / {station.position.lng.toFixed(4)}
                      </div>
                    </div>
                    <span className="pill subtle">{station.siteId || 'Allgemein'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
