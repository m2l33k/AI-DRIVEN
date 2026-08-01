echo "Building Docker images for Kubernetes using Minikube..."

# Define an array of services
SERVICES=(
  "spring-cloud/eureka-server:eureka-server"
  "spring-cloud/gateway-service:gateway-service"
  "microservices/auth-service:auth-service"
)

eval $(minikube docker-env --profile microservice-deployment)

# Iterate over services and build each one
for SERVICE in "${SERVICES[@]}"; do
  IFS=":" read -r DIR IMAGE <<< "$SERVICE"
  echo "Building $IMAGE..."
  cd "$DIR" || { echo "Failed to enter directory $DIR"; exit 1; }
  docker build -t "$IMAGE" .
  cd - >/dev/null || exit 1
  echo "$IMAGE built successfully!"
done

echo "All images built successfully!"
