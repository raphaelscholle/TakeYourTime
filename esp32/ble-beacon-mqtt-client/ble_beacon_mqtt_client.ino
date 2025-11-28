#include <WiFi.h>
#include <PubSubClient.h>
#include <NimBLEDevice.h>
#include <NimBLEUtils.h>

// ==== Configuration ====
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char *MQTT_HOST = "192.168.1.10"; // Update to your Mosquitto host/IP
const uint16_t MQTT_PORT = 1883;
const char *MQTT_USER = "mqttuser";
const char *MQTT_PASSWORD = "changeme"; // Use the password printed by setup-mosquitto-debian.sh
const char *MQTT_CLIENT_ID = "esp32-ble-bridge";
const char *MQTT_TOPIC = "ble/beacons";
// =======================

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

String payloadToHex(const std::string &payload) {
  static const char hex[] = "0123456789abcdef";
  String output;
  output.reserve(payload.size() * 2);
  for (uint8_t byte : payload) {
    output += hex[(byte >> 4) & 0x0F];
    output += hex[byte & 0x0F];
  }
  return output;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.printf("\nWi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
}

void ensureMqtt() {
  if (mqttClient.connected()) {
    return;
  }

  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
      Serial.println("connected");
      break;
    }
    Serial.printf("failed, rc=%d. Retrying in 5s...\n", mqttClient.state());
    delay(5000);
  }
}

class BeaconCallbacks : public NimBLEAdvertisedDeviceCallbacks {
  void onResult(NimBLEAdvertisedDevice *advertisedDevice) override {
    if (!mqttClient.connected()) {
      return;
    }

    String payloadHex = payloadToHex(advertisedDevice->getPayload());

    char json[320];
    snprintf(
        json, sizeof(json),
        "{\"address\":\"%s\",\"rssi\":%d,\"type\":\"%s\",\"adv\":\"%s\"}",
        advertisedDevice->getAddress().toString().c_str(), advertisedDevice->getRSSI(),
        NimBLEUtils::advTypeToString(advertisedDevice->getAdvType()).c_str(), payloadHex.c_str());

    mqttClient.publish(MQTT_TOPIC, json);
  }
};

void setup() {
  Serial.begin(115200);
  delay(200);

  ensureWifi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setBufferSize(512);
  ensureMqtt();

  NimBLEDevice::init("BLE-MQTT-Bridge");
  NimBLEScan *pScan = NimBLEDevice::getScan();
  pScan->setAdvertisedDeviceCallbacks(new BeaconCallbacks());
  pScan->setActiveScan(true);
  pScan->setInterval(45);
  pScan->setWindow(15);
  pScan->start(0, nullptr, false);

  Serial.println("Scanning for BLE beacons and forwarding to MQTT...");
}

void loop() {
  ensureWifi();
  ensureMqtt();
  mqttClient.loop();
  delay(10);
}
