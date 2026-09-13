#!/bin/bash
#
# Manage local infrastructure for the platform:
#   - Infra stack        : Keycloak, PostgreSQL, MongoDB
#   - Observability stack: Prometheus, Grafana, Loki, Tempo, Fluent Bit
#   - 5G Core (optional) : free5GC NFs via docker-compose-5gc.yml
#
# Usage:
#   ./infra.sh up              Start infra + observability (detached)
#   ./infra.sh up --5gc        Also start free5GC control-plane (no UPF on Windows)
#   ./infra.sh down            Stop and remove the containers
#   ./infra.sh down -v         Stop, remove containers AND volumes (wipes data)
#   ./infra.sh 5gc up          Start / restart only the 5GC containers
#   ./infra.sh 5gc down        Stop only the 5GC containers
#   ./infra.sh 5gc status      Show 5GC container status
#   ./infra.sh status          Show all container status
#   ./infra.sh logs [svc]      Follow logs (optionally for a single service)
#   ./infra.sh urls            Print the service URLs
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"

COMPOSE=(docker compose \
  -f "$DOCKER_DIR/docker-compose-infra.yml" \
  -f "$DOCKER_DIR/docker-compose-observability.yml")

# free5GC compose file (always appended when --5gc flag or 5gc subcommand is used)
F5GC_FILE="$DOCKER_DIR/docker-compose-5gc.yml"

# On Windows/Mac, UPF requires the Linux gtp5g kernel module — skip it.
# Override by setting SKIP_UPF=false in your shell if you are on Linux.
if [[ "$(uname -s)" == "Linux" ]]; then
  SCALE_UPF=()
else
  SCALE_UPF=(--scale free5gc-upf=0)
fi

print_urls() {
  cat <<'EOF'

Service URLs:
  Keycloak    http://localhost:8081   (admin / admin)
  Grafana     http://localhost:3000   (admin / admin)
  Prometheus  http://localhost:9090
  Loki        http://localhost:3100
  Tempo       http://localhost:3200
  Postgres    localhost:5432          (user / pwd, db: course_db)
  MongoDB     localhost:27017
EOF
}

print_5gc_urls() {
  cat <<'EOF'

free5GC URLs:
  WebConsole  http://localhost:5000   (admin / free5gc)
  NRF         http://localhost:8000
  AMF         http://localhost:8001
EOF
}

cmd="${1:-up}"

# ── 5gc subcommand ────────────────────────────────────────────────────────────
if [[ "$cmd" == "5gc" ]]; then
  subcmd="${2:-status}"
  COMPOSE_5GC=(docker compose -f "$F5GC_FILE")
  case "$subcmd" in
    up)
      echo "Starting free5GC control-plane containers..."
      if [[ ${#SCALE_UPF[@]} -gt 0 ]]; then
        echo "  (Windows/Mac detected — UPF scaled to 0; requires Linux gtp5g module)"
      fi
      "${COMPOSE_5GC[@]}" up -d "${SCALE_UPF[@]}"
      "${COMPOSE_5GC[@]}" ps
      print_5gc_urls
      ;;
    down)
      shift 2 || true
      echo "Stopping free5GC containers..."
      "${COMPOSE_5GC[@]}" down "$@"
      ;;
    status|ps)
      "${COMPOSE_5GC[@]}" ps
      ;;
    *)
      echo "Usage: $0 5gc {up|down [-v]|status}" >&2
      exit 1
      ;;
  esac
  exit 0
fi

# ── main commands ─────────────────────────────────────────────────────────────
case "$cmd" in
  up)
    # Check for --5gc flag in remaining args
    WITH_5GC=false
    EXTRA_ARGS=()
    for arg in "${@:2}"; do
      if [[ "$arg" == "--5gc" ]]; then
        WITH_5GC=true
      else
        EXTRA_ARGS+=("$arg")
      fi
    done

    if $WITH_5GC; then
      FULL_COMPOSE=(docker compose \
        -f "$DOCKER_DIR/docker-compose-infra.yml" \
        -f "$DOCKER_DIR/docker-compose-observability.yml" \
        -f "$F5GC_FILE")
      echo "Starting infra + observability + free5GC stacks..."
      if [[ ${#SCALE_UPF[@]} -gt 0 ]]; then
        echo "  (Windows/Mac detected — UPF scaled to 0)"
      fi
      "${FULL_COMPOSE[@]}" up -d "${SCALE_UPF[@]}" "${EXTRA_ARGS[@]}"
      "${FULL_COMPOSE[@]}" ps
      print_urls
      print_5gc_urls
    else
      echo "Starting infra + observability stacks..."
      "${COMPOSE[@]}" up -d "${EXTRA_ARGS[@]}"
      "${COMPOSE[@]}" ps
      print_urls
    fi
    echo
    echo "Reminder: import keycloak/platform-realm.json into Keycloak to create roles/users."
    echo "Tip: use --5gc flag to also start the free5GC 5G Core."
    ;;
  down)
    shift || true
    echo "Stopping infra + observability stacks..."
    "${COMPOSE[@]}" down "$@"
    ;;
  status|ps)
    "${COMPOSE[@]}" ps
    ;;
  logs)
    shift || true
    "${COMPOSE[@]}" logs -f "$@"
    ;;
  urls)
    print_urls
    print_5gc_urls
    ;;
  *)
    echo "Usage: $0 {up [--5gc]|down [-v]|5gc {up|down|status}|status|logs [service]|urls}" >&2
    exit 1
    ;;
esac
