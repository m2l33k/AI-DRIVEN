FROM jenkins/jenkins:lts-jdk17

USER root

# ── Maven 3.9 ─────────────────────────────────────────────────────────────────
ARG MAVEN_VERSION=3.9.9
RUN curl -fsSL https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
    | tar -xzC /opt && \
    ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn

# ── Node 20 + Angular CLI ─────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @angular/cli@latest

# ── Python 3 + pip (ML service tests) ────────────────────────────────────────
RUN apt-get install -y python3 python3-pip python3-venv && \
    pip3 install --no-cache-dir --break-system-packages \
        pytest pytest-mock django djangorestframework numpy

# ── Docker CLI (build images via host socket) ─────────────────────────────────
RUN apt-get install -y ca-certificates curl gnupg lsb-release && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y docker-ce-cli

# ── Trivy (container & filesystem vulnerability scanner) ─────────────────────
RUN curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
        | gpg --dearmor -o /usr/share/keyrings/trivy.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
        > /etc/apt/sources.list.d/trivy.list && \
    apt-get update && apt-get install -y trivy

# ── Cleanup ───────────────────────────────────────────────────────────────────
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Jenkins user in docker group (for socket access) ─────────────────────────
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

ENV MAVEN_HOME=/opt/apache-maven-${MAVEN_VERSION}
ENV PATH="${MAVEN_HOME}/bin:${PATH}"
