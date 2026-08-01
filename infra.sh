#!/bin/bash
#
# Manage local infrastructure for the platform:
#   - Infra stack        : Keycloak, PostgreSQL, MongoDB
#   - Observability stack: Prometheus, Grafana, Loki, Tempo, Fluent Bit
#
# Usage:
#   ./infra.sh up        Start all infra + observability containers (detached)
#   ./infra.sh down      Stop and remove the containers
#   ./infra.sh down -v   Stop, remove containers AND volumes (wipes data)
#   ./infra.sh status    Show container status
#   ./infra.sh logs [svc]  Follow logs (optionally for a single service)
#   ./infra.sh urls      Print the service URLs
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"

COMPOSE=(docker compose \
  -f "$DOCKER_DIR/docker-compose-infra.yml" \
  -f "$DOCKER_DIR/docker-compose-observability.yml")

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

cmd="${1:-up}"
case "$cmd" in
  up)
    echo "Starting infra + observability stacks..."
    "${COMPOSE[@]}" up -d
    "${COMPOSE[@]}" ps
    print_urls
    echo
    echo "Reminder: import keycloak/platform-realm.json into Keycloak to create roles/users."
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
    ;;
  *)
    echo "Usage: $0 {up|down [-v]|status|logs [service]|urls}" >&2
    exit 1
    ;;
esac
