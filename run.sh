#!/bin/bash
#
# Build and run the platform services (eureka-server, gateway-service).
#
# Usage:
#   ./run.sh            Build with Maven, then run the services as local JARs
#   ./run.sh docker     Build images and run the services via Docker Compose
#   ./run.sh --no-build Skip the Maven build and just run existing JARs
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer the Maven wrapper if present, otherwise fall back to a system mvn.
if [[ -x "./mvnw" ]]; then
  MVN="./mvnw"
else
  MVN="mvn"
fi

# Kill whatever is listening on a port (best-effort; needs lsof).
kill_service_on_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    local pid
    pid=$(lsof -ti ":$port" || true)
    if [[ -n "$pid" ]]; then
      echo "Killing process on port $port (PID: $pid)"
      kill -9 $pid
    fi
  fi
}

# Find and run the latest runnable JAR for a module directory (relative to repo root).
run_service() {
  local service_dir=$1
  local jar_file
  jar_file=$(find "$service_dir/target" -type f -name "*.jar" ! -name "*-plain.jar" 2>/dev/null | head -n 1)

  if [[ -z "$jar_file" ]]; then
    echo "No JAR file found for $service_dir! Did the build run?"
    return 1
  fi

  echo "Starting $service_dir using $jar_file..."
  java -jar "$jar_file" &
}

# ---- Docker mode -------------------------------------------------------------
if [[ "${1:-}" == "docker" ]]; then
  echo "Building modules (Docker images need the JARs first)..."
  "$MVN" clean package -DskipTests
  echo "Restarting services via Docker Compose..."
  docker compose -f docker/docker-compose-base.yml down
  docker compose -f docker/docker-compose-base.yml up --build
  exit 0
fi

# ---- Local (JAR) mode --------------------------------------------------------
if [[ "${1:-}" != "--no-build" ]]; then
  echo "Building modules..."
  "$MVN" clean package -DskipTests
fi

echo "Freeing service ports..."
kill_service_on_port 8761
kill_service_on_port 9000
kill_service_on_port 9001

# Start Eureka first so the other services can register with it.
run_service "spring-cloud/eureka-server"
echo "Waiting for Eureka to come up..."
sleep 15
run_service "microservices/auth-service"
run_service "spring-cloud/gateway-service"

echo
echo "Services starting:"
echo "  Eureka dashboard  http://localhost:8761"
echo "  Gateway health    http://localhost:9000/actuator/health"
echo "  Gateway Swagger   http://localhost:9000/swagger-ui.html"
echo "  Auth service      http://localhost:9001/swagger-ui.html"
echo
echo "Press Ctrl+C to stop."

# Wait for the background service processes.
wait
