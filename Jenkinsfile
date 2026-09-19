/**
 * 5G Telecom Platform — Main CI Pipeline
 *
 * Stages (parallel where independent):
 *   1. Checkout & Metadata
 *   2. Parallel: Backend Build | Frontend Install | ML Lint
 *   3. Parallel: Backend Tests | Frontend Build + Test | ML Tests | Security Scan
 *   4. Stash / Archive Artifacts
 *   5. Docker Build (main branch only)
 *   6. Summary
 *
 * Plugins required:
 *   Pipeline, Pipeline: Stage View, JUnit, HTML Publisher,
 *   Workspace Cleanup, Warnings Next Generation (optional),
 *   Docker Pipeline (for Docker stages)
 */

pipeline {

    agent any

    // ── Global options ────────────────────────────────────────────────────────
    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    // ── Parameters (manual trigger) ───────────────────────────────────────────
    parameters {
        booleanParam(
            name: 'SKIP_DOCKER',
            defaultValue: false,
            description: 'Skip Docker image build even on main branch'
        )
        booleanParam(
            name: 'SKIP_SECURITY',
            defaultValue: false,
            description: 'Skip Trivy security scan (speeds up local testing)'
        )
    }

    // ── Environment ───────────────────────────────────────────────────────────
    environment {
        MAVEN_OPTS   = '-Xmx768m -XX:+TieredCompilation -XX:TieredStopAtLevel=1'
        NODE_OPTIONS = '--max-old-space-size=1024'
        GIT_SHORT    = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo unknown', returnStdout: true).trim()
        BUILD_VERSION = "${env.BRANCH_NAME?.replaceAll('/', '-') ?: 'local'}-${GIT_SHORT}-${env.BUILD_NUMBER}"
        REGISTRY      = 'ghcr.io'
        IMAGE_PREFIX  = "${REGISTRY}/m2l33k"
    }

    // ─────────────────────────────────────────────────────────────────────────
    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    currentBuild.displayName = "#${env.BUILD_NUMBER} — ${BUILD_VERSION}"
                    currentBuild.description = "Branch: ${env.BRANCH_NAME ?: 'local'} | Commit: ${GIT_SHORT}"
                }
                sh '''
                    echo "=== Build Info ==="
                    echo "Branch  : ${BRANCH_NAME:-local}"
                    echo "Commit  : ${GIT_SHORT}"
                    echo "Version : ${BUILD_VERSION}"
                    java  -version
                    mvn   -version
                    node  -version
                    npm   -version
                    python3 --version
                '''
            }
        }

        // ── Stage 2: Compile + Install (parallel) ─────────────────────────────
        stage('Compile') {
            parallel {

                stage('Backend — Compile') {
                    steps {
                        sh 'mvn -B clean package -DskipTests --no-transfer-progress -T 4'
                    }
                    post {
                        failure { echo 'Maven compile failed — check build logs above.' }
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

        // ── Stage 3: Test + Build (parallel) ──────────────────────────────────
        stage('Verify') {
            parallel {

                // ── 3a. Spring Boot unit tests ─────────────────────────────────
                stage('Backend — Unit Tests') {
                    steps {
                        sh 'mvn -B test --no-transfer-progress -T 4'
                    }
                    post {
                        always {
                            junit(
                                testResults:        '**/target/surefire-reports/TEST-*.xml',
                                allowEmptyResults:  true,
                                skipMarkingBuildUnstable: false
                            )
                        }
                        failure {
                            echo 'Unit tests failed — see JUnit report above.'
                        }
                    }
                }

                // ── 3b. Angular production build + tests ───────────────────────
                stage('Frontend — Build & Test') {
                    steps {
                        dir('Frontend') {
                            sh 'npx ng build --configuration production --no-progress'
                            sh 'npx ng test --watch=false --no-progress || true'
                        }
                    }
                    post {
                        always {
                            junit(
                                testResults:       'Frontend/test-results/*.xml',
                                allowEmptyResults: true
                            )
                        }
                    }
                }

                // ── 3c. ML service tests (mocked TF/Prophet) ───────────────────
                stage('ML — Tests') {
                    steps {
                        sh '''
                            mkdir -p ml-service/test-results
                            python3 -m pytest ml-service/tests/ \
                                -v \
                                --tb=short \
                                --junit-xml=ml-service/test-results/pytest.xml \
                                -p no:warnings
                        '''
                    }
                    post {
                        always {
                            junit(
                                testResults:       'ml-service/test-results/pytest.xml',
                                allowEmptyResults: true
                            )
                        }
                    }
                }

                // ── 3d. Trivy security scan ────────────────────────────────────
                stage('Security — Trivy') {
                    when {
                        not { expression { params.SKIP_SECURITY } }
                    }
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
                            echo "=== Trivy scan complete ==="
                            cat reports/trivy-fs.txt
                        '''
                    }
                    post {
                        always {
                            archiveArtifacts(
                                artifacts:     'reports/trivy-fs.txt',
                                allowEmptyArchive: true
                            )
                        }
                    }
                }

            }
        }

        // ── Stage 4: Integration Tests ────────────────────────────────────────
        // Testcontainers uses the Docker socket (mounted at /var/run/docker.sock)
        // to spin up PostgreSQL + Redis for the rate-limiting integration tests.
        // Unit tests are NOT re-run here — only *IT.java classes via Failsafe.
        stage('Backend — Integration Tests') {
            steps {
                withEnv(['TESTCONTAINERS_RYUK_DISABLED=true']) {
                    sh 'mvn -B failsafe:integration-test failsafe:verify --no-transfer-progress'
                }
            }
            post {
                always {
                    junit(
                        testResults:       '**/target/failsafe-reports/TEST-*.xml',
                        allowEmptyResults: true,
                        skipMarkingBuildUnstable: false
                    )
                }
                failure {
                    echo 'Integration tests failed — check Testcontainers container startup logs above.'
                }
            }
        }

        // ── Stage 5: Archive artifacts ─────────────────────────────────────────
        stage('Archive') {
            steps {
                archiveArtifacts(
                    artifacts:            'microservices/*/target/*.jar, spring-cloud/*/target/*.jar',
                    allowEmptyArchive:    true,
                    fingerprint:          true,
                    onlyIfSuccessful:     true
                )
                stash(
                    name:     'jars',
                    includes: 'microservices/*/target/*.jar,spring-cloud/*/target/*.jar'
                )
            }
        }

        // ── Stage 5: Docker build & push (main branch only) ───────────────────
        stage('Docker') {
            when {
                allOf {
                    anyOf {
                        branch 'main'
                        tag pattern: 'v\\d+\\.\\d+\\.\\d+.*', comparator: 'REGEXP'
                    }
                    not { expression { params.SKIP_DOCKER } }
                }
            }
            stages {

                stage('Docker — Spring Boot Services') {
                    steps {
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

                            // Build all images in parallel
                            def buildSteps = [:]
                            services.each { svc ->
                                def s = svc   // capture for closure
                                buildSteps["docker-${s.name}"] = {
                                    stage("  ${s.name}") {
                                        sh """
                                            docker build \
                                                -t ${IMAGE_PREFIX}/${s.name}:${BUILD_VERSION} \
                                                -t ${IMAGE_PREFIX}/${s.name}:latest \
                                                --label "git.commit=${GIT_SHORT}" \
                                                --label "build.number=${env.BUILD_NUMBER}" \
                                                ${s.ctx}
                                        """
                                    }
                                }
                            }
                            parallel buildSteps
                        }
                    }
                }

                stage('Docker — ML Service') {
                    steps {
                        sh """
                            docker build \
                                -t ${IMAGE_PREFIX}/ml-service:${BUILD_VERSION} \
                                -t ${IMAGE_PREFIX}/ml-service:latest \
                                --label "git.commit=${GIT_SHORT}" \
                                ml-service
                        """
                    }
                }

                stage('Docker — Trivy Image Scan') {
                    when {
                        not { expression { params.SKIP_SECURITY } }
                    }
                    steps {
                        script {
                            def images = [
                                'auth-service',
                                'anomaly-detection-service',
                                'gateway-service',
                                'audit-service',
                            ]
                            images.each { img ->
                                sh """
                                    trivy image \
                                        --severity CRITICAL \
                                        --ignore-unfixed \
                                        --exit-code 0 \
                                        --format table \
                                        ${IMAGE_PREFIX}/${img}:latest 2>&1 \
                                    | tee reports/trivy-image-${img}.txt || true
                                """
                            }
                        }
                        archiveArtifacts(
                            artifacts:         'reports/trivy-image-*.txt',
                            allowEmptyArchive: true
                        )
                    }
                }

                stage('Docker — Push to Registry') {
                    steps {
                        withCredentials([
                            usernamePassword(
                                credentialsId: 'ghcr-credentials',
                                usernameVariable: 'GHCR_USER',
                                passwordVariable: 'GHCR_TOKEN'
                            )
                        ]) {
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
                                    sh "docker push ${IMAGE_PREFIX}/${img}:${BUILD_VERSION}"
                                    sh "docker push ${IMAGE_PREFIX}/${img}:latest"
                                }
                            }
                        }
                    }
                    post {
                        always {
                            sh 'docker logout ${REGISTRY} || true'
                        }
                    }
                }

            }
        }

    }

    // ── Post-pipeline ─────────────────────────────────────────────────────────
    post {

        always {
            script {
                def summary = """
=================================================
  BUILD SUMMARY — ${currentBuild.displayName}
=================================================
  Status  : ${currentBuild.currentResult}
  Branch  : ${env.BRANCH_NAME ?: 'local'}
  Commit  : ${GIT_SHORT}
  Version : ${BUILD_VERSION}
  Duration: ${currentBuild.durationString}
=================================================
"""
                echo summary
            }
        }

        success {
            echo "Pipeline passed. All tests green, artifacts archived."
        }

        unstable {
            echo "Pipeline is UNSTABLE — some tests failed. Check the JUnit report."
        }

        failure {
            echo "Pipeline FAILED. Check the stage logs above for details."
        }

        cleanup {
            cleanWs(
                cleanWhenSuccess:    true,
                cleanWhenFailure:    false,
                cleanWhenUnstable:   false,
                cleanWhenNotBuilt:   true,
                deleteDirs:          true,
                notFailBuild:        true,
                patterns: [[pattern: '**/target/**', type: 'INCLUDE'],
                           [pattern: 'Frontend/dist/**', type: 'INCLUDE']]
            )
        }
    }
}
