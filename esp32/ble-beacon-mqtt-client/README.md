# ESP32 BLE Beacon MQTT Client

A minimal Arduino sketch that connects an ESP32 to Wi-Fi, signs into the Mosquitto broker installed by `scripts/setup-mosquitto-debian.sh`, scans for BLE beacons, and publishes each advertisement to MQTT.

## Prerequisites
- ESP32 board support installed in the Arduino IDE or PlatformIO
- Libraries:
  - [PubSubClient](https://github.com/knolleary/pubsubclient)
  - [NimBLE-Arduino](https://github.com/h2zero/NimBLE-Arduino)
- An MQTT broker reachable from the ESP32 (e.g., Mosquitto installed on Debian)

## Usage
1. Copy `ble_beacon_mqtt_client.ino` into your Arduino sketchbook (or open it directly).
2. Update the configuration constants near the top for Wi-Fi credentials, MQTT host/port, and MQTT username/password.
3. Flash the sketch to your ESP32.
4. Monitor the serial console at 115200 baud to view connection logs and published BLE beacon data.

## MQTT topic format
- Beacons are published as JSON to `ble/beacons`. Example payload:

```json
{
  "address": "aa:bb:cc:dd:ee:ff",
  "rssi": -52,
  "type": "ADV_IND",
  "adv": "0201060303aafe"
}
```

`adv` is the raw advertisement payload as a lowercase hexadecimal string.
