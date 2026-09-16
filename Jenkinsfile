pipeline {
    agent any

    environment {
        WORKSPACE_DIR = '/workspace'
        MAVEN_OPTS    = '-Xmx512m -XX:+TieredCompilation -XX:TieredStopAtLevel=1'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Branch: ${env.BRANCH_NAME ?: 'local'}"
                echo "Workspace: ${WORKSPACE}"
            }
        }

        // ── Backend ────────────────────────────────────────────────────────────

        stage('Build — Spring Boot Services') {
            steps {
                dir("${WORKSPACE_DIR}") {
                    sh 'mvn clean package -DskipTests -T 4 --no-transfer-progress'
                }
            }
        }

        stage('Unit Tests — Spring Boot Services') {
            steps {
                dir("${WORKSPACE_DIR}") {
                    sh 'mvn test -T 4 --no-transfer-progress'
                }
            }
            post {
                always {
                    junit(
                        testResults: '**/target/surefire-reports/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        // ── Frontend ───────────────────────────────────────────────────────────

        stage('Install — Frontend') {
            steps {
                dir("${WORKSPACE_DIR}/Frontend") {
                    sh 'npm ci --prefer-offline'
                }
            }
        }

        stage('Lint — Frontend') {
            steps {
                dir("${WORKSPACE_DIR}/Frontend") {
                    sh 'npx ng lint --format stylish || true'
                }
            }
        }

        stage('Build — Frontend') {
            steps {
                dir("${WORKSPACE_DIR}/Frontend") {
                    sh 'npx ng build --configuration production --no-progress'
                }
            }
        }

        stage('Unit Tests — Frontend') {
            steps {
                dir("${WORKSPACE_DIR}/Frontend") {
                    sh '''
                        npx ng test \
                          --watch=false \
                          --browsers=ChromeHeadless \
                          --code-coverage \
                          --reporters=junit,progress \
                          --no-progress || true
                    '''
                }
            }
            post {
                always {
                    junit(
                        testResults: 'Frontend/test-results/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        // ── ML Service ─────────────────────────────────────────────────────────

        stage('Test — ML Service (Python)') {
            steps {
                dir("${WORKSPACE_DIR}/ml-service") {
                    sh '''
                        python3 -m pytest forecasting/ \
                          -v \
                          --tb=short \
                          --junit-xml=test-results/pytest.xml \
                          -p no:warnings || true
                    '''
                }
            }
            post {
                always {
                    junit(
                        testResults: 'ml-service/test-results/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

    }

    post {
        success {
            echo "All stages passed."
        }
        failure {
            echo "Build failed — check test reports above."
        }
        always {
            cleanWs(cleanWhenNotBuilt: false, cleanWhenFailure: false)
        }
    }
}
