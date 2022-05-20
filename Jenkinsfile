node {
    REGISTRY="us-central1-docker.pkg.dev/atypon-artifact/docker-registry"
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
        DOCKER_IMAGE="leanworkflow/manuspcripts-api"
        IMG_TAG=sh(script: "jq .version < package.json", returnStdout: true).trim()
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

                docker.withServer('unix:///var/run/docker-ci.sock') {
                    app = docker.build("${DOCKER_IMAGE}:${IMG_TAG}", "-f docker/app/Dockerfile .")
                }

                // push to registry
                docker.withRegistry("https://${REGISTRY}") {
                    app.push();
                    app.push('latest');
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
                withCredentials([string(credentialsId: 'PRESSROOM_APIKEY', variable: 'APP_PRESSROOM_APIKEY')]) {
                    env.APP_PRESSROOM_APIKEY="${APP_PRESSROOM_APIKEY}"
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

            }
        },
        failFast: false
    ])

}

