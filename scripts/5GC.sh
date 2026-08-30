#!/bin/bash
#
# 5GC.sh — bring up the real 5G Core (free5GC) together with the other containers.
#
# free5GC is the open-source 5G Core substrate (Go NFs: NRF/AMF/SMF/UPF/AUSF/UDM/UDR/PCF/NSSF)
# driven by UERANSIM (gNB/UE simulator). It runs from the upstream `free5gc-compose` project
# (all NFs + MongoDB + WebConsole) — a SEPARATE runtime that this Spring/Angular platform
# (the "harness") observes, hardens and tests. See Noted/architecture-physique/ and memory/5GC-Core.md.
#
# ⚠️  LINUX ONLY: free5GC's UPF needs the out-of-tree `gtp5g` kernel module, so this must run on
#     Ubuntu 22.04 (VM) or WSL2 with a gtp5g-built kernel — NOT bare Windows/macOS Docker.
#
# Usage:
#   ./scripts/5GC.sh up            Start the free5GC core (+ UERANSIM + MongoDB + WebConsole)
#   ./scripts/5GC.sh compose       Start free5GC + platform infra as ONE stack, ONE network
#                                  (docker/docker-compose-5gc.yml joined to shared-network)
#   ./scripts/5GC.sh all           Start free5GC AND the harness infra (two separate stacks)
#   ./scripts/5GC.sh down          Stop and remove the free5GC containers
#   ./scripts/5GC.sh down -v       Stop, remove containers AND volumes (wipes subscriber data)
#   ./scripts/5GC.sh status        Show free5GC container status
#   ./scripts/5GC.sh logs [svc]    Follow logs (optionally a single NF, e.g. amf/smf/upf)
#   ./scripts/5GC.sh ueransim      Start the UERANSIM gNB/UE profile (traffic generation)
#   ./scripts/5GC.sh urls          Print the WebConsole / core endpoints
#   ./scripts/5GC.sh doctor        Preflight checks (OS, docker, gtp5g, repo)
#
# Config (override via env):
#   FREE5GC_DIR   Where free5gc-compose is cloned   (default: ../free5gc-compose, sibling of the repo)
#   FREE5GC_REPO  Upstream git repo                 (default: https://github.com/free5gc/free5gc-compose.git)
#   FREE5GC_REF   Git tag/branch to check out       (default: empty = repo default)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FREE5GC_DIR="${FREE5GC_DIR:-$REPO_ROOT/../free5gc-compose}"
FREE5GC_REPO="${FREE5GC_REPO:-https://github.com/free5gc/free5gc-compose.git}"
FREE5GC_REF="${FREE5GC_REF:-}"
COMPOSE_FILE="docker-compose.yaml"

log()  { printf '\033[1;36m[5GC]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[5GC] WARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[5GC] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
check_os() {
  case "$(uname -s)" in
    Linux) : ;;
    *) die "free5GC runs on Linux only (needs the gtp5g kernel module). Use an Ubuntu VM or WSL2." ;;
  esac
}

check_docker() {
  command -v docker >/dev/null 2>&1 || die "docker not found on PATH."
  docker compose version >/dev/null 2>&1 || die "'docker compose' (v2) is required."
}

check_gtp5g() {
  if lsmod 2>/dev/null | grep -q '^gtp5g'; then
    log "gtp5g kernel module is loaded."
  else
    warn "gtp5g kernel module is NOT loaded — the UPF will fail to start."
    warn "Build & load it (matching your running kernel), e.g.:"
    warn "    git clone https://github.com/free5gc/gtp5g.git && cd gtp5g && make && sudo make install"
    warn "    sudo modprobe gtp5g   # then verify: lsmod | grep gtp5g"
  fi
}

ensure_repo() {
  if [ ! -d "$FREE5GC_DIR/.git" ]; then
    log "free5gc-compose not found at $FREE5GC_DIR — cloning..."
    command -v git >/dev/null 2>&1 || die "git not found; cannot clone free5gc-compose."
    git clone "$FREE5GC_REPO" "$FREE5GC_DIR"
    if [ -n "$FREE5GC_REF" ]; then
      ( cd "$FREE5GC_DIR" && git checkout "$FREE5GC_REF" )
    fi
  fi
  [ -f "$FREE5GC_DIR/$COMPOSE_FILE" ] || die "No $COMPOSE_FILE in $FREE5GC_DIR (unexpected free5gc-compose layout)."
}

compose() { ( cd "$FREE5GC_DIR" && docker compose -f "$COMPOSE_FILE" "$@" ); }

# Option A — free5GC integrated into THIS repo's stack (one project, one shared-network).
# Uses docker/docker-compose-5gc.yml which mounts NF config/cert from $FREE5GC_DIR.
DOCKER_DIR="$REPO_ROOT/docker"
integrated() {
  FREE5GC_DIR="$FREE5GC_DIR" F5GC_DIR="$FREE5GC_DIR" \
  docker compose \
    -f "$DOCKER_DIR/docker-compose-infra.yml" \
    -f "$DOCKER_DIR/docker-compose-observability.yml" \
    -f "$DOCKER_DIR/docker-compose-5gc.yml" \
    "$@"
}

print_urls() {
  cat <<'EOF'

free5GC endpoints:
  WebConsole   http://localhost:5000        (provision IMSI/keys/slices — admin / free5gc)
  MongoDB      localhost:27017              (subscriber & NF context store)
  NRF (SBI)    http://localhost:8000        (NF registry + OAuth2 authz server)

Integrate with the Nexo harness (this repo):
  - Prometheus can scrape NF metrics; Fluent Bit/promtail can ship NF logs to Loki.
  - The gateway's /api/nf/* facade (roadmap) queries the NRF nf-instances endpoint.
EOF
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
cmd="${1:-up}"
case "$cmd" in
  up)
    check_os; check_docker; check_gtp5g; ensure_repo
    log "Starting free5GC core (NFs + MongoDB + WebConsole)..."
    compose up -d
    compose ps
    print_urls
    ;;
  compose)
    # Option A — one stack, one network: platform infra + observability + free5GC.
    # free5GC's config/cert are mounted from $FREE5GC_DIR (the cloned free5gc-compose).
    # Passthrough: `compose` (=up -d) | `compose down [-v]` | `compose ps` | `compose logs [svc]`
    shift || true
    check_docker; ensure_repo
    if [ $# -eq 0 ]; then
      check_os; check_gtp5g
      log "Starting platform infra + observability + free5GC as one stack..."
      integrated up -d
      integrated ps
      print_urls
    else
      integrated "$@"
    fi
    ;;
  all)
    # free5GC + the harness's own infra/observability as TWO separate stacks
    check_os; check_docker; check_gtp5g; ensure_repo
    log "Starting free5GC core..."
    compose up -d
    log "Starting harness infra + observability (infra.sh up)..."
    ( cd "$REPO_ROOT" && ./infra.sh up )
    compose ps
    print_urls
    ;;
  ueransim)
    check_os; check_docker; ensure_repo
    log "Starting UERANSIM (gNB/UE) profile..."
    # free5gc-compose ships UERANSIM under a compose profile / separate file depending on version
    compose --profile ueransim up -d 2>/dev/null \
      || compose -f docker-compose.yaml -f docker-compose-ueransim.yaml up -d ueransim 2>/dev/null \
      || warn "Could not auto-detect the UERANSIM service/profile — check $FREE5GC_DIR for the ueransim compose file."
    ;;
  down)
    shift || true
    check_docker; ensure_repo
    log "Stopping free5GC core..."
    compose down "$@"
    ;;
  status|ps)
    check_docker; ensure_repo
    compose ps
    ;;
  logs)
    shift || true
    check_docker; ensure_repo
    compose logs -f "$@"
    ;;
  urls)
    print_urls
    ;;
  doctor)
    log "Preflight checks:"
    check_os && log "OS: Linux OK"
    check_docker && log "docker + compose OK"
    check_gtp5g
    if [ -f "$FREE5GC_DIR/$COMPOSE_FILE" ]; then log "free5gc-compose present at $FREE5GC_DIR"; else warn "free5gc-compose not cloned yet (run 'up' to fetch it)."; fi
    ;;
  *)
    echo "Usage: $0 {up|compose [up|down [-v]|ps|logs [svc]]|all|ueransim|down [-v]|status|logs [service]|urls|doctor}" >&2
    exit 1
    ;;
esac
