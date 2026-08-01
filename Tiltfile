# Define and build infrastructure services
k8s_yaml([
    "kubernetes/infrastructure/keycloak/keycloak.yml",
    "kubernetes/infrastructure/postgres/postgres.yml",
    "kubernetes/infrastructure/mongodb/mongodb.yml",
    "kubernetes/infrastructure/prometheus/prometheus.yml",
    "kubernetes/infrastructure/fluent-bit/fluent-bit.yml",
    "kubernetes/infrastructure/loki/loki.yml",
    "kubernetes/infrastructure/tempo/tempo.yml",
    "kubernetes/infrastructure/grafana/grafana.yml"

])

# Define infrastructure resources
k8s_resource("keycloak", labels=["infra"], auto_init=True)
k8s_resource("prometheus", labels=["observability"], auto_init=True)
k8s_resource("fluent-bit", labels=["observability"], auto_init=True)
k8s_resource("loki", labels=["observability"], auto_init=True)
k8s_resource("tempo", labels=["observability"], auto_init=True)
k8s_resource("grafana", labels=["observability"], auto_init=True)
k8s_resource("course-postgres", labels=["infra"], auto_init=True)
k8s_resource("review-mongodb", labels=["infra"], auto_init=True)

# Define and build eureka-server
docker_build(
    "eureka-server",
    context="./spring-cloud/eureka-server",
    dockerfile="./spring-cloud/eureka-server/Dockerfile",
    live_update=[
        sync("./spring-cloud/eureka-server/src", "/application/src"),
        run("mvn package -DskipTests", trigger=["/application/src"]),
    ]
)
k8s_yaml([
    "spring-cloud/eureka-server/kubernetes/deployment.yml",
    "spring-cloud/eureka-server/kubernetes/service.yml"
])
k8s_resource(
    "eureka-server",
    port_forwards="8761:8761",
    labels=["services"]
)

# Define and build auth-service
docker_build(
    "auth-service",
    context="./microservices/auth-service",
    dockerfile="./microservices/auth-service/Dockerfile",
    live_update=[
        sync("./microservices/auth-service/src", "/application/src"),
        run("mvn package -DskipTests", trigger=["/application/src"]),
    ]
)
k8s_yaml([
    "microservices/auth-service/kubernetes/deployment.yml",
    "microservices/auth-service/kubernetes/service.yml"
])
k8s_resource(
    "auth-service",
    port_forwards="9001:9001",
    labels=["services"]
)

# Define and build gateway-service
docker_build(
    "gateway-service",
    context="./spring-cloud/gateway-service",
    dockerfile="./spring-cloud/gateway-service/Dockerfile",
    live_update=[
        sync("./spring-cloud/gateway-service/src", "/application/src"),
        run("mvn package -DskipTests", trigger=["/application/src"]),
    ]
)
k8s_yaml([
    "spring-cloud/gateway-service/kubernetes/deployment.yml",
    "spring-cloud/gateway-service/kubernetes/service.yml",
    "spring-cloud/gateway-service/kubernetes/ingress.yml"
])
k8s_resource(
    "gateway-service",
    labels=["services"]
)