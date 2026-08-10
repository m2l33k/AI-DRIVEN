#!/bin/bash
#
# Export the running Keycloak realm to keycloak/platform-realm.json (config-as-code).
#
# Run this AFTER changing roles/clients/users in Keycloak so the change is captured in git
# and survives `infra.sh down -v` or a fresh clone (which re-import platform-realm.json).
#
# Requires the keycloak container to be running (./infra.sh up).
#
# Usage:
#   ./keycloak/export-realm.sh                 # export realm 'auth-management'
#   ./keycloak/export-realm.sh myrealm
#
set -euo pipefail

REALM="${1:-auth-management}"
CONTAINER="${2:-keycloak}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/platform-realm.json"

echo "Exporting realm '$REALM' from container '$CONTAINER' (includes users)..."
docker exec "$CONTAINER" /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/export --realm "$REALM" --users realm_file

docker cp "$CONTAINER:/opt/keycloak/data/export/${REALM}-realm.json" "$TARGET"

cat <<EOF

Wrote $TARGET
NOTE: the export hardcodes SMTP values. If you rely on the \${KC_SMTP_USER} /
      \${KC_SMTP_PASSWORD} placeholders, restore them in the smtpServer block
      before committing (secrets must not be committed).
Review the diff, then commit platform-realm.json.
EOF
