FROM mcr.microsoft.com/openjdk/jdk:25-ubuntu as builder
WORKDIR extracted

ADD ./target/*.jar app.jar

RUN java -Djarmode=layertools -jar app.jar extract

FROM mcr.microsoft.com/openjdk/jdk:25-ubuntu
WORKDIR application

# Copy the dependencies layer from the builder stage
COPY --from=builder extracted/dependencies/ ./
# Copy the Spring Boot loader layer from the builder stage
COPY --from=builder extracted/spring-boot-loader/ ./
# Copy the snapshot dependencies layer from the builder stage
COPY --from=builder extracted/snapshot-dependencies/ ./
# Copy the application layer from the builder stage
COPY --from=builder extracted/application/ ./

# Expose port 9000
EXPOSE 9000

# Set the entry point to launch the application
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]

