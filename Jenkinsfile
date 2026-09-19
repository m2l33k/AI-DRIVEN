/**
 * 5G Telecom Platform — Main CI Pipeline
 *
 * Stages:
 *   1. Checkout & Metadata
 *   2. Parallel: Backend Build | Frontend Install
 *   3. Parallel: Backend Unit Tests | Frontend Build+Test | ML Tests | Trivy
 *   4. Backend Integration Tests  (Testcontainers via Docker socket)
 *   5. Archive artifacts
 *   6. Docker Build & Push        (main branch / tags only)
 *
 * Required plugins: Pipeline, Pipeline Stage View, JUnit, Docker Pipeline
 */

pipeline {

    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    parameters {
        booleanParam(name: 'SKIP_DOCKER',   defaultValue: false, description: 'Skip Docker build even on main')
        booleanParam(name: 'SKIP_SECURITY', defaultValue: false, description: 'Skip Trivy scan')
    }

    // Only static values here — computed vars (GIT_SHORT, BUILD_VERSION) are set
    // in the Checkout script block where a workspace is available.
    environment {
        MAVEN_OPTS   = '-Xmx768m -XX:+TieredCompilation -XX:TieredStopAtLevel=1'
        NODE_OPTIONS = '--max-old-space-size=1024'
        REGISTRY     = 'ghcr.io'
        IMAGE_PREFIX = 'ghcr.io/m2l33k'
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT     = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo unknown', returnStdout: true).trim()
                    // BRANCH_NAME is only set in Multibranch pipelines; regular Pipeline jobs use GIT_BRANCH (e.g. "origin/main")
                    def rawBranch     = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
                    def branch        = rawBranch.replaceAll('^origin/', '')
                    env.BRANCH_CLEAN  = branch
                    env.BUILD_VERSION = "${branch.replaceAll('/', '-')}-${env.GIT_SHORT}-${env.BUILD_NUMBER}"
                    currentBuild.displayName = "#${env.BUILD_NUMBER} — ${env.BUILD_VERSION}"
                    currentBuild.description = "Branch: ${branch} | Commit: ${env.GIT_SHORT}"
                }
                sh '''
                    echo "=== Build Info ==="
                    echo "Branch  : ${BRANCH_NAME:-local}"
                    echo "Commit  : ${GIT_SHORT}"
                    echo "Version : ${BUILD_VERSION}"
                    java    -version
                    mvn     -version
                    node    --version
                    npm     -version
                    python3 --version
                '''
            }
        }

        // ── Stage 2: Compile (parallel) ───────────────────────────────────────
        stage('Compile') {
            parallel {

                stage('Backend — Compile') {
                    steps {
                        sh 'mvn -B clean package -DskipTests --no-transfer-progress -T 4'
                    }
                    post {
                        failure { echo 'Maven compile failed — check logs above.' }
                    }
                }

                stage('Frontend — Install') {
                    steps {
                        dir('Frontend') {
                            sh 'npm ci --prefer-offline'
                            sh 'npx tsc --noEmit --project tsconfig.app.json'
                        }
                    }
                    post {
                        failure { echo 'Frontend install or TypeScript check failed.' }
                    }
                }

            }
        }

        // ── Stage 3: Verify (parallel) ────────────────────────────────────────
        stage('Verify') {
            parallel {

                stage('Backend — Unit Tests') {
                    steps {
                        sh 'mvn -B test --no-transfer-progress -T 4'
                    }
                    post {
                        always {
                            junit(
                                testResults:              '**/target/surefire-reports/TEST-*.xml',
                                allowEmptyResults:        true,
                                skipMarkingBuildUnstable: false
                            )
                        }
                        failure { echo 'Unit tests failed — see JUnit report above.' }
                    }
                }

                stage('Frontend — Build & Test') {
                    steps {
                        dir('Frontend') {
                            sh 'npx ng build --configuration production --no-progress'
                            sh 'npx ng test --watch=false --no-progress || true'
                        }
                    }
                    post {
                        always {
                            junit(testResults: 'Frontend/test-results/*.xml', allowEmptyResults: true)
                        }
                    }
                }

                stage('ML — Tests') {
                    steps {
                        sh '''
                            mkdir -p ml-service/test-results
                            python3 -m pytest ml-service/tests/ \
                                -v --tb=short \
                                --junit-xml=ml-service/test-results/pytest.xml \
                                -p no:warnings || true
                        '''
                    }
                    post {
                        always {
                            junit(testResults: 'ml-service/test-results/pytest.xml', allowEmptyResults: true)
                        }
                    }
                }

                stage('Security — Trivy') {
                    when { not { expression { params.SKIP_SECURITY } } }
                    steps {
                        sh '''
                            mkdir -p reports
                            trivy fs . \
                                --severity CRITICAL,HIGH \
                                --ignore-unfixed \
                                --skip-dirs node_modules,free5gc-compose,.git,target \
                                --format table \
                                --output reports/trivy-fs.txt \
                                --exit-code 0
                            cat reports/trivy-fs.txt
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts(artifacts: 'reports/trivy-fs.txt', allowEmptyArchive: true)
                        }
                    }
                }

            }
        }

        // ── Stage 4: OWASP Dependency-Check ──────────────────────────────────
        stage('Security — OWASP Dependency-Check') {
            when { not { expression { params.SKIP_SECURITY } } }
            steps {
                script {
                    // NVD API key is optional — without it the DB download is slower
                    // but the scan still works. Add credential 'nvd-api-key' to speed it up.
                    def nvdFlag = ''
                    try {
                        withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_TMP')]) {
                            nvdFlag = "-DnvdApiKey=${env.NVD_TMP}"
                        }
                    } catch (ignored) {
                        echo 'nvd-api-key credential not configured — running without API key (first run will be slow)'
                    }
                    sh """
                        mkdir -p reports/owasp
                        mvn -B org.owasp:dependency-check-maven:12.1.1:aggregate \
                            ${nvdFlag} \
                            -Dformat=ALL \
                            -DfailBuildOnCVSS=9 \
                            -DfailOnError=false \
                            -DsuppressionFiles=owasp-suppressions.xml \
                            -DoutputDirectory=\${WORKSPACE}/reports/owasp \
                            --no-transfer-progress
                    """
                }
            }
            post {
                always {
                    archiveArtifacts(
                        artifacts:        'reports/owasp/dependency-check-report.*',
                        allowEmptyArchive: true
                    )
                    // Requires "OWASP Dependency-Check" Jenkins plugin for trend graphs
                    dependencyCheckPublisher(
                        pattern:           'reports/owasp/dependency-check-report.xml',
                        failedTotalCritical: 1,
                        unstableTotalHigh:   10
                    )
                }
            }
        }

        // ── Stage 5: Integration Tests ────────────────────────────────────────
        // Testcontainers spins up PostgreSQL + Redis via the Docker socket
        // (/var/run/docker.sock mounted in the Jenkins container).
        // Only *IT.java classes run here — unit tests are not repeated.
        stage('Backend — Integration Tests') {
            steps {
                withEnv([
                    'TESTCONTAINERS_RYUK_DISABLED=true',
                    // Jenkins runs in a docker-compose network; 172.17.0.1 is unreachable from there.
                    // host.docker.internal is injected into every container by Docker Desktop.
                    'TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal'
                ]) {
                    // Pre-pull via ECR Public (Docker Hub is blocked on the university network).
                    // Retag to the plain name so Testcontainers finds them in the local cache.
                    sh '''
                        docker pull public.ecr.aws/docker/library/postgres:16-alpine \
                            && docker tag public.ecr.aws/docker/library/postgres:16-alpine postgres:16-alpine \
                            || true
                        docker pull public.ecr.aws/docker/library/redis:7-alpine \
                            && docker tag public.ecr.aws/docker/library/redis:7-alpine redis:7-alpine \
                            || true
                    '''
                    sh 'mvn -B failsafe:integration-test failsafe:verify --no-transfer-progress'
                }
            }
            post {
                always {
                    junit(
                        testResults:              '**/target/failsafe-reports/TEST-*.xml',
                        allowEmptyResults:        true,
                        skipMarkingBuildUnstable: false
                    )
                }
                failure { echo 'Integration tests failed — check Testcontainers logs above.' }
            }
        }

        // ── Stage 5: Archive ──────────────────────────────────────────────────
        stage('Archive') {
            steps {
                archiveArtifacts(
                    artifacts:         'microservices/*/target/*.jar, spring-cloud/*/target/*.jar',
                    allowEmptyArchive: true,
                    fingerprint:       true,
                    onlyIfSuccessful:  true
                )
                stash(name: 'jars', includes: 'microservices/*/target/*.jar,spring-cloud/*/target/*.jar')
            }
        }

        // ── Stage 6: Docker (main / tags only) ───────────────────────────────
        stage('Docker') {

            when {
                allOf {
                    anyOf {
                        expression { env.BRANCH_CLEAN == 'main' }
                        tag pattern: 'v\\d+\\.\\d+\\.\\d+.*', comparator: 'REGEXP'
                    }
                    not { expression { params.SKIP_DOCKER } }
                }
            }
            stages {

                stage('Docker — Spring Boot Services') {
                    steps {
                        withEnv(['DOCKER_BUILDKIT=0']) {
                        script {
                            def services = [
                                [name: 'auth-service',                ctx: 'microservices/auth-service'],
                                [name: 'roaming-analysis-service',    ctx: 'microservices/roaming-analysis-service'],
                                [name: 'anomaly-detection-service',   ctx: 'microservices/anomaly-detection-service'],
                                [name: 'rate-limiting-service',       ctx: 'microservices/rate-limiting-service'],
                                [name: 'audit-service',               ctx: 'microservices/audit-service'],
                                [name: 'messaging-service',           ctx: 'microservices/messaging-service'],
                                [name: 'fivegc-service',              ctx: 'microservices/fivegc-service'],
                                [name: 'distributed-tracing-service', ctx: 'microservices/distributed-tracing-service'],
                                [name: 'fault-injection-service',     ctx: 'microservices/fault-injection-service'],
                                [name: 'gateway-service',             ctx: 'spring-cloud/gateway-service'],
                                [name: 'eureka-server',               ctx: 'spring-cloud/eureka-server'],
                            ]
                            def buildSteps = [:]
                            services.each { svc ->
                                def s = svc
                                buildSteps["docker-${s.name}"] = {
                                    stage("  ${s.name}") {
                                        sh """
                                            docker build \
                                                -t ${env.IMAGE_PREFIX}/${s.name}:${env.BUILD_VERSION} \
                                                -t ${env.IMAGE_PREFIX}/${s.name}:latest \
                                                --label git.commit=${env.GIT_SHORT} \
                                                --label build.number=${env.BUILD_NUMBER} \
                                                ${s.ctx}
                                        """
                                    }
                                }
                            }
                            parallel buildSteps
                        }
                        } // withEnv DOCKER_BUILDKIT=0
                    }
                }

                stage('Docker — ML Service') {
                    steps {
                        withEnv(['DOCKER_BUILDKIT=0']) {
                        sh """
                            docker build \
                                -t ${env.IMAGE_PREFIX}/ml-service:${env.BUILD_VERSION} \
                                -t ${env.IMAGE_PREFIX}/ml-service:latest \
                                --label git.commit=${env.GIT_SHORT} \
                                ml-service
                        """
                        } // withEnv
                    }
                }

                stage('Docker — Trivy Image Scan') {
                    when { not { expression { params.SKIP_SECURITY } } }
                    steps {
                        script {
                            ['auth-service', 'anomaly-detection-service', 'gateway-service', 'audit-service'].each { img ->
                                sh """
                                    trivy image \
                                        --severity CRITICAL --ignore-unfixed \
                                        --exit-code 0 --format table \
                                        ${env.IMAGE_PREFIX}/${img}:latest 2>&1 \
                                    | tee reports/trivy-image-${img}.txt || true
                                """
                            }
                        }
                        archiveArtifacts(artifacts: 'reports/trivy-image-*.txt', allowEmptyArchive: true)
                    }
                }

                stage('Docker — Push') {
                    steps {
                        withCredentials([usernamePassword(
                            credentialsId: 'ghcr-credentials',
                            usernameVariable: 'GHCR_USER',
                            passwordVariable: 'GHCR_TOKEN'
                        )]) {
                            sh 'echo "${GHCR_TOKEN}" | docker login ${REGISTRY} -u ${GHCR_USER} --password-stdin'
                            script {
                                def allImages = [
                                    'auth-service', 'roaming-analysis-service',
                                    'anomaly-detection-service', 'rate-limiting-service',
                                    'audit-service', 'messaging-service', 'fivegc-service',
                                    'distributed-tracing-service', 'fault-injection-service',
                                    'gateway-service', 'eureka-server', 'ml-service',
                                ]
                                allImages.each { img ->
                                    sh "docker push ${env.IMAGE_PREFIX}/${img}:${env.BUILD_VERSION}"
                                    sh "docker push ${env.IMAGE_PREFIX}/${img}:latest"
                                }
                            }
                        }
                    }
                    post {
                        always { sh 'docker logout ${REGISTRY} || true' }
                    }
                }

            }
        }

    }

    // ── Post-pipeline ─────────────────────────────────────────────────────────
    post {

        always {
            script {
                echo """
=================================================
  BUILD SUMMARY — ${currentBuild.displayName}
=================================================
  Status  : ${currentBuild.currentResult}
  Branch  : ${env.BRANCH_CLEAN ?: 'main'}
  Commit  : ${env.GIT_SHORT ?: 'unknown'}
  Version : ${env.BUILD_VERSION ?: 'unknown'}
  Duration: ${currentBuild.durationString}
================================================="""
            }
        }

        success {
            echo 'Pipeline passed. All tests green, artifacts archived.'
            mail(
                to:      'malekaziz.hassayoun@esprit.tn',
                subject: "✅ BUILD PASSED — ${currentBuild.displayName}",
                body:    """\
Build passed successfully.

Job     : ${env.JOB_NAME}
Version : ${env.BUILD_VERSION ?: 'unknown'}
Branch  : ${env.BRANCH_CLEAN ?: 'main'}
Commit  : ${env.GIT_SHORT ?: 'unknown'}
Duration: ${currentBuild.durationString}

View build: ${env.BUILD_URL}
"""
            )
        }

        unstable {
            echo 'Pipeline UNSTABLE — some tests failed. Check the JUnit report.'
            mail(
                to:      'malekaziz.hassayoun@esprit.tn',
                subject: "⚠️ BUILD UNSTABLE — ${currentBuild.displayName}",
                body:    """\
Build completed with test failures.

Job     : ${env.JOB_NAME}
Version : ${env.BUILD_VERSION ?: 'unknown'}
Branch  : ${env.BRANCH_CLEAN ?: 'main'}
Commit  : ${env.GIT_SHORT ?: 'unknown'}
Duration: ${currentBuild.durationString}

Check the JUnit report: ${env.BUILD_URL}testReport/
"""
            )
        }

        failure {
            echo 'Pipeline FAILED. Check the stage logs above for details.'
            mail(
                to:      'malekaziz.hassayoun@esprit.tn',
                subject: "❌ BUILD FAILED — ${currentBuild.displayName}",
                body:    """\
Build failed. Immediate attention required.

Job     : ${env.JOB_NAME}
Version : ${env.BUILD_VERSION ?: 'unknown'}
Branch  : ${env.BRANCH_CLEAN ?: 'main'}
Commit  : ${env.GIT_SHORT ?: 'unknown'}
Duration: ${currentBuild.durationString}

Console log: ${env.BUILD_URL}console
"""
            )
        }

        cleanup {
            // deleteDir() replaces cleanWs (Workspace Cleanup plugin not required)
            deleteDir()
        }
    }
}
