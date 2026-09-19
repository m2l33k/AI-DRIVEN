FROM mcr.microsoft.com/openjdk/jdk:17-ubuntu as builder
WORKDIR extracted

ADD ./target/*.jar app.jar

RUN java -Djarmode=layertools -jar app.jar extract

FROM mcr.microsoft.com/openjdk/jdk:17-ubuntu
WORKDIR application

COPY --from=builder extracted/dependencies/ ./
COPY --from=builder extracted/spring-boot-loader/ ./
COPY --from=builder extracted/snapshot-dependencies/ ./
COPY --from=builder extracted/application/ ./

EXPOSE 9009

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
