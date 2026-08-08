<#
.SYNOPSIS
  Configure realm SMTP on a running Keycloak so it can send verify-email links,
  reusing the same Gmail account as auth-service (MAIL_USERNAME / MAIL_PASSWORD).

.DESCRIPTION
  The docker realm import only applies to a fresh Keycloak; an already-running realm
  won't pick up platform-realm.json changes. This script sets it live via the Admin API:
  it reads the Gmail creds from the repo-root .env (or the environment), fetches the current
  realm representation, injects smtpServer, and PUTs it back.

.EXAMPLE
  ./keycloak/configure-smtp.ps1
#>
param(
  [string]$KeycloakUrl = "http://localhost:8081",
  [string]$Realm       = "auth-management",
  [string]$AdminUser   = "admin",
  [string]$AdminPass   = "admin",
  [string]$SmtpUser    = $env:MAIL_USERNAME,
  [string]$SmtpPass    = $env:MAIL_PASSWORD
)

$ErrorActionPreference = "Stop"

# Fall back to the repo-root .env for the Gmail creds if not already in the environment.
$envFile = Join-Path $PSScriptRoot "..\.env"
if ((-not $SmtpUser -or -not $SmtpPass) -and (Test-Path $envFile)) {
  Get-Content $envFile | Where-Object { $_ -match '^\s*MAIL_(USERNAME|PASSWORD)\s*=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim(); $val = $parts[1].Trim()
    if ($key -eq 'MAIL_USERNAME' -and -not $SmtpUser) { $SmtpUser = $val }
    if ($key -eq 'MAIL_PASSWORD' -and -not $SmtpPass) { $SmtpPass = $val }
  }
}
if (-not $SmtpUser -or -not $SmtpPass) {
  throw "MAIL_USERNAME / MAIL_PASSWORD not found in environment or $envFile"
}

# 1. Admin token (master realm, admin-cli).
$token = (Invoke-RestMethod -Method Post `
  -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body @{ grant_type = 'password'; client_id = 'admin-cli'; username = $AdminUser; password = $AdminPass }
).access_token
$headers = @{ Authorization = "Bearer $token" }

# 2. Current realm representation. (Note: $realm and $Realm are the SAME variable in
#    PowerShell — case-insensitive — so the fetched object must use a distinct name.)
$realmRep = Invoke-RestMethod -Method Get -Uri "$KeycloakUrl/admin/realms/$Realm" -Headers $headers

# 3. Inject Gmail SMTP.
$smtp = @{
  host            = 'smtp.gmail.com'
  port            = '587'
  starttls        = 'true'
  ssl             = 'false'
  auth            = 'true'
  from            = $SmtpUser
  fromDisplayName = '5GC Platform'
  user            = $SmtpUser
  password        = $SmtpPass
}
$realmRep | Add-Member -NotePropertyName smtpServer -NotePropertyValue $smtp -Force

# 4. Persist.
Invoke-RestMethod -Method Put -Uri "$KeycloakUrl/admin/realms/$Realm" -Headers $headers `
  -ContentType "application/json" -Body ($realmRep | ConvertTo-Json -Depth 30) | Out-Null

Write-Host "SMTP configured for realm '$Realm' using $SmtpUser."
Write-Host "Test it in the Keycloak admin console: Realm settings -> Email -> Test connection."
