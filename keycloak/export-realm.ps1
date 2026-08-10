# Export the running Keycloak realm to keycloak/platform-realm.json (config-as-code).
#
# Run this AFTER changing roles/clients/users in Keycloak so the change is captured in git
# and survives `infra.sh down -v` or a fresh clone (which re-import platform-realm.json).
#
# Requires the keycloak container to be running (./infra.sh up).
#
# Usage:
#   ./keycloak/export-realm.ps1                 # export realm 'auth-management'
#   ./keycloak/export-realm.ps1 -Realm myrealm
#
param(
  [string]$Realm = "auth-management",
  [string]$Container = "keycloak"
)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $scriptDir "platform-realm.json"

Write-Host "Exporting realm '$Realm' from container '$Container' (includes users)..."
docker exec $Container /opt/keycloak/bin/kc.sh export `
  --dir /opt/keycloak/data/export --realm $Realm --users realm_file
if ($LASTEXITCODE -ne 0) { throw "kc.sh export failed (is the container running?)" }

docker cp "${Container}:/opt/keycloak/data/export/$Realm-realm.json" $target
if ($LASTEXITCODE -ne 0) { throw "docker cp failed" }

Write-Host ""
Write-Host "Wrote $target"
Write-Host "NOTE: the export hardcodes SMTP values. If you rely on the \${KC_SMTP_USER} /"
Write-Host "      \${KC_SMTP_PASSWORD} placeholders, restore them in the smtpServer block"
Write-Host "      before committing (secrets must not be committed)."
Write-Host "Review the diff, then commit platform-realm.json."
