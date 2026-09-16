#!/bin/bash
# ATK-02 — IMSI Enumeration
# Probes sequential IMSIs at a metered 100 ms rate to evade burst detection.
# The anomaly-detection-service detects the sequential pattern (≥5 in a row, gap ≤2).
#
# Usage: ./attack-imsi-enum.sh [start=1] [end=100]

START=${1:-1}
END=${2:-100}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_TPL="${SCRIPT_DIR}/../config/ueransim/free5gc-ue-flood.yaml"
GNB_CFG="${SCRIPT_DIR}/../config/ueransim/free5gc-gnb.yaml"

if ! command -v nr-ue &>/dev/null; then
  echo "[ATK-02] ERROR: nr-ue not found. Install UERANSIM first." >&2
  exit 1
fi

if [ ! -f "$CONFIG_TPL" ]; then
  echo "[ATK-02] ERROR: UE template not found: $CONFIG_TPL" >&2
  exit 1
fi

echo "[ATK-02] Starting gNB..."
nr-gnb -c "$GNB_CFG" &
GNB_PID=$!
sleep 1

echo "[ATK-02] IMSI enumeration: $START → $END (100 ms between probes)"

for i in $(seq "$START" "$END"); do
  SUPI=$(printf "imsi-00101%010d" "$i")
  TMP_CFG="/tmp/probe-$i.yaml"
  sed "s/supi: .*/supi: '$SUPI'/" "$CONFIG_TPL" > "$TMP_CFG"

  # Register and immediately deregister — probe-and-go pattern
  timeout 3 nr-ue -c "$TMP_CFG" &
  sleep 0.1  # 100 ms gap → 10/s rate, suspicious but not a burst
done

wait 2>/dev/null
kill "$GNB_PID" 2>/dev/null

echo "[ATK-02] Done. Check /security/alerts for HIGH IMSI_ENUMERATION alert."
