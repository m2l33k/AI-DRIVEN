#!/bin/bash
#
# Configure realm SMTP on a running Keycloak so it can send verify-email links,
# reusing the same Gmail account as auth-service (MAIL_USERNAME / MAIL_PASSWORD).
#
# The docker realm import only applies to a fresh Keycloak; an already-running realm
# won't pick up platform-realm.json changes. This script sets it live via the Admin API:
# it reads the Gmail creds from the repo-root .env (or the environment), fetches the current
# realm representation, injects smtpServer with jq, and PUTs it back.
#
# Requires: curl, jq.
#
# Usage:
#   ./keycloak/configure-smtp.sh
#
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8081}"
REALM="${REALM:-auth-management}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Fall back to the repo-root .env for the Gmail creds if not already in the environment.
if [[ -z "${MAIL_USERNAME:-}" || -z "${MAIL_PASSWORD:-}" ]] && [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

SMTP_USER="${MAIL_USERNAME:-}"
SMTP_PASS="${MAIL_PASSWORD:-}"
if [[ -z "$SMTP_USER" || -z "$SMTP_PASS" ]]; then
  echo "MAIL_USERNAME / MAIL_PASSWORD not found in environment or $ENV_FILE" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "jq is required (sudo apt install jq)" >&2; exit 1; }

# 1. Admin token (master realm, admin-cli).
TOKEN=$(curl -fsS -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" -d "client_id=admin-cli" \
  -d "username=$ADMIN_USER" -d "password=$ADMIN_PASS" \
  | jq -r '.access_token')

# 2. Current realm representation, with smtpServer injected.
UPDATED=$(curl -fsS "$KEYCLOAK_URL/admin/realms/$REALM" \
  -H "Authorization: Bearer $TOKEN" \
  | jq --arg user "$SMTP_USER" --arg pass "$SMTP_PASS" '.smtpServer = {
      host: "smtp.gmail.com",
      port: "587",
      starttls: "true",
      ssl: "false",
      auth: "true",
      from: $user,
      fromDisplayName: "5GC Platform",
      user: $user,
      password: $pass
    }')

# 3. Persist.
curl -fsS -X PUT "$KEYCLOAK_URL/admin/realms/$REALM" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATED" >/dev/null

echo "SMTP configured for realm '$REALM' using $SMTP_USER."
echo "Test it in the Keycloak admin console: Realm settings -> Email -> Test connection."
