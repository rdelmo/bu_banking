/*
 * Lion Kings Bank — CI/CD Pipeline
 * ===================================
 * Runs on every push/PR. Stages:
 *   1. Checkout       — pull source code
 *   2. Dependencies   — install Python requirements
 *   3. Lint           — check code style (flake8)
 *   4. Test           — run Django test suite, publish JUnit results
 *   5. Docker Build   — build backend + frontend images
 *   6. Docker Push    — push images to a registry (configure credentials below)
 *
 * Prerequisites (set up once in Jenkins):
 *   • A Jenkins agent with Python 3.12, pip, Docker, and Node 20 installed.
 *   • A Jenkins "Secret text" credential named DJANGO_SECRET_KEY.
 *   • (Optional) A Jenkins "Username/Password" credential named DOCKER_REGISTRY_CREDS
 *     if you want to push images to a private registry.
 *
 * First-time Jenkins setup:
 *   1. Install Jenkins (or use the docker-compose in cicd/).
 *   2. Install plugins: "Pipeline", "Git", "JUnit", "Docker Pipeline".
 *   3. Create a new Pipeline job → set SCM to your Git repo → set Script Path to Jenkinsfile.
 *   4. Add the credentials listed above under Manage Jenkins → Credentials.
 *   5. Click Build Now.
 */

pipeline {
    agent any

    environment {
        VENV          = 'venv'
        IMAGE_BACKEND = 'lionkingsbank/backend'
        IMAGE_FRONTEND= 'lionkingsbank/frontend'
        IMAGE_TAG     = "${env.BUILD_NUMBER}"
    }

    options {
        // Abort the build if it takes longer than 20 minutes
        timeout(time: 20, unit: 'MINUTES')
        // Keep only the last 10 build records
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        // ── 1. Checkout ────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building branch: ${env.BRANCH_NAME ?: 'unknown'}, commit: ${env.GIT_COMMIT?.take(8) ?: 'unknown'}"
            }
        }

        // ── 2. Install dependencies ────────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                sh '''
                    python3 -m venv ${VENV}
                    . ${VENV}/bin/activate
                    pip install --upgrade pip --quiet
                    pip install -r requirements.txt --quiet
                    # flake8 is only needed for CI; not in requirements.txt
                    pip install flake8 --quiet
                '''
            }
        }

        // ── 3. Lint ────────────────────────────────────────────────────────
        stage('Lint') {
            steps {
                sh '''
                    . ${VENV}/bin/activate
                    # Only check errors that actually break the code:
                    #   F8xx = undefined names, unused imports (real errors)
                    #   E501 = lines over 120 chars
                    # Ignore pure whitespace/formatting issues (W2xx, E1xx, E2xx, E3xx)
                    # which are style preferences and don't affect functionality.
                    flake8 banking/ extra_credit_union/ \
                        --max-line-length=120 \
                        --select=F8,E501 \
                        --exclude=banking/migrations/,banking/tests_default_accounts.py,banking/tests_user_account.py,banking/test_view.py,banking/registration_view.py \
                        --statistics
                '''
            }
        }

        // ── 4. Test ────────────────────────────────────────────────────────
        stage('Test') {
            environment {
                // Use a throwaway secret key so tests never touch production secrets
                DJANGO_SECRET_KEY = 'ci-test-only-not-a-real-secret'
                DJANGO_DEBUG      = 'true'
            }
            steps {
                sh '''
                    . ${VENV}/bin/activate
                    python manage.py migrate --noinput
                    # unittest-xml-reporting provides xmlrunner for JUnit XML output
                    pip install unittest-xml-reporting --quiet
                    python manage.py test banking \
                        --verbosity 2 \
                        --testrunner xmlrunner.extra.djangotestrunner.XMLTestRunner \
                        --output test-results
                '''
            }
            post {
                always {
                    // Publish test results so Jenkins shows pass/fail per test
                    junit allowEmptyResults: true, testResults: 'test-results/*.xml'
                }
            }
        }

        // ── 5. Docker Build ────────────────────────────────────────────────
        stage('Docker Build') {
            steps {
                sh '''
                    docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG} -t ${IMAGE_BACKEND}:latest .
                    docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} -t ${IMAGE_FRONTEND}:latest ./frontend
                '''
            }
        }

        // ── 6. Docker Push ─────────────────────────────────────────────────
        // Remove or comment this stage out if you don't have a registry yet.
        // To enable: add a Jenkins credential named DOCKER_REGISTRY_CREDS
        // (Username/Password) with your Docker Hub or private registry details.
        stage('Docker Push') {
            when {
                // Only push on the main branch, not every feature branch
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'DOCKER_REGISTRY_CREDS',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_BACKEND}:latest
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:latest
                    '''
                }
            }
        }

    }

    // ── Post-build actions ─────────────────────────────────────────────────
    post {
        success {
            echo "Pipeline succeeded. Images: ${IMAGE_BACKEND}:${IMAGE_TAG}, ${IMAGE_FRONTEND}:${IMAGE_TAG}"
        }
        failure {
            echo "Pipeline FAILED — check the stage logs above for details."
        }
        always {
            // Clean up the virtual environment to keep the workspace tidy
            sh 'rm -rf ${VENV}'
        }
    }
}

