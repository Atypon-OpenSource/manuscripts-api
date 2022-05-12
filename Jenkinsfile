node {
    REGISTRY="docker-reg.atypon.com"
    REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"
    stage("checkout") {
        if (params != null && params.ghprbPullId == null) {
            echo 'Checking out from master'
            // master needs to be substituted with the release branch.
            REFSPEC="+refs/heads/master:refs/remotes/origin/master"
        }
        VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
            doGenerateSubmoduleConfigurations: false,
            submoduleCfg: [],
            userRemoteConfigs: [
                [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
                name: 'origin',
                refspec: "${REFSPEC}",
                url: 'git@github.com:Atypon-OpenSource/manuscripts-api.git']
            ]]
        )
        DOCKER_IMAGE="man/api"
        IMG_TAG=sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
    }

    stage("install") {
        nodejs(nodeJSInstallationName: 'node 12.22.1') {
            sh (script: "npm ci")
        }
    }

    stage("lint") {
        nodejs(nodeJSInstallationName: 'node 12.22.1') {
            sh (script: "npm run build")
            sh (script: "npm run lint")
        }
    }

    parallel([
        'run_app': {
            node {
            VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
            doGenerateSubmoduleConfigurations: false,
            submoduleCfg: [],
            userRemoteConfigs: [
                [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
                name: 'origin',
                refspec: "${REFSPEC}",
                url: 'git@github.com:Atypon-OpenSource/manuscripts-api.git']
            ]]
            )
            sh ("""./bin/build-env.js .env.example > .env""")
            env.NODE_ENV="production"
            withEnv(readFile('.env').split('\n') as List) {
                sh "env"
                nodejs(nodeJSInstallationName: 'node 12.22.1') {
                    sh (script: "npm ci")
                    sh (script: "npx gulp -f docker/utils/Gulpfile.js")
                    dir('docker') {
                        sh (script: "cp ../.env .env")
                        sh (script: "docker-compose build --pull")
                        sh (script: "docker-compose up -d ")
                        sh (script: "sleep 20")
                        sh (script: """
if [  -z `nc -z localhost 3000` ]; then \
  echo "server is running"; \
  exit 0; \
else \
  echo "server is NOT running"; \
  exit 1; \
fi""")
                    }
                }
            }
            }
        },
        'unit_tests': {
            
            node {
            
                VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
                doGenerateSubmoduleConfigurations: false,
                submoduleCfg: [],
                userRemoteConfigs: [
                    [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
                    name: 'origin',
                    refspec: "${REFSPEC}",
                    url: 'git@github.com:Atypon-OpenSource/manuscripts-api.git']
                ]])

                sh (script: "npm ci")
                sh (script: "./bin/set-package-json-version.sh")
                sh (script: "./bin/build-env.js .env.example > .env")
                env.NODE_ENV="test"
                env.APP_TEST_ACTION="test:unit"
                withEnv(readFile('.env').split('\n') as List) {
                    nodejs(nodeJSInstallationName: 'node 12.22.1') {
                        sh (script: "npm ci")
                        sh (script: "npx gulp -f docker/utils/Gulpfile.js")
                        dir('docker') {
                            sh (script: "cp ../.env .env")
                            sh (script: "docker-compose build --pull")
                            sh (script: "docker-compose up --build --abort-on-container-exit test_runner")
                        }
                    }
                }
            }
        },
        'integration_tests': {
            node {
                VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
                doGenerateSubmoduleConfigurations: false,
                submoduleCfg: [],
                userRemoteConfigs: [
                    [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
                    name: 'origin',
                    refspec: "${REFSPEC}",
                    url: 'git@github.com:Atypon-OpenSource/manuscripts-api.git']
                ]])

                sh (script: "npm ci")
                sh (script: "./bin/set-package-json-version.sh")
                sh (script: "./bin/build-env.js .env.example > .env")
                env.NODE_ENV="test"
                env.APP_TEST_ACTION="test:int"
                env.APP_PRESSROOM_BASE_URL="https://pressroom-js-dev.manuscripts.io"
                env.APP_PRESSROOM_APIKEY="cndbvbvjosp0viowj"
                withEnv(readFile('.env').split('\n') as List) {
                    nodejs(nodeJSInstallationName: 'node 12.22.1') {
                        sh (script: "npm ci")
                        sh (script: "npx gulp -f docker/utils/Gulpfile.js")
                        dir('docker') {
                            sh (script: "cp ../.env .env")
                            sh (script: "docker-compose build --pull")
                            sh (script: "docker-compose up -d postgres")
                            env.APP_DATABASE_URL="postgresql://postgres:admin@localhost:5432/test?schema=public"
                            sh (script: "npm run migrate-prisma")
                            sh (script: "docker-compose up --build --abort-on-container-exit test_runner")
                        }
                    }
                }

            }
        },
        failFast: false
    ])
}
