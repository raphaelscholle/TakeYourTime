#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run this script as root (e.g., with sudo)." >&2
  exit 1
fi

MQTT_USER=${MQTT_USER:-mqttuser}
MQTT_PASSWORD=${MQTT_PASSWORD:-}
MQTT_PORT=${MQTT_PORT:-1883}
CONFIG_PATH=/etc/mosquitto/conf.d/takeyourtime.conf
PASSWD_PATH=/etc/mosquitto/passwd

if [[ -z "$MQTT_PASSWORD" ]]; then
  MQTT_PASSWORD=$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-20)
fi

echo "Updating apt package index..."
apt-get update -y

echo "Installing mosquitto broker and CLI tools..."
apt-get install -y mosquitto mosquitto-clients openssl

echo "Configuring mosquitto..."
mkdir -p /etc/mosquitto/conf.d

cat <<MOSQCONF > "$CONFIG_PATH"
listener ${MQTT_PORT}
allow_anonymous false
password_file ${PASSWD_PATH}
persistence true
persistence_location /var/lib/mosquitto/
log_dest syslog
log_dest stdout
MOSQCONF

mosquitto_passwd -b -c "$PASSWD_PATH" "$MQTT_USER" "$MQTT_PASSWORD"
chown mosquitto:mosquitto "$PASSWD_PATH"
chmod 640 "$PASSWD_PATH"

systemctl enable --now mosquitto

cat <<INFO

Mosquitto installation complete.
  - Config: ${CONFIG_PATH}
  - Password file: ${PASSWD_PATH}
  - MQTT listener: tcp://localhost:${MQTT_PORT}
  - MQTT username: ${MQTT_USER}
  - MQTT password: ${MQTT_PASSWORD}

Use mosquitto_sub to test: mosquitto_sub -h localhost -p ${MQTT_PORT} -u ${MQTT_USER} -P '${MQTT_PASSWORD}' -t '#'
INFO
