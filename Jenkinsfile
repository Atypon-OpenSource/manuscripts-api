node {
    REGISTRY="us-central1-docker.pkg.dev/atypon-artifact/docker-registry-public"
    REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"
    ansiColor('xterm') {
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
        DOCKER_IMAGE="leanworkflow/manuscripts-api"
        IMG_TAG=sh(script: "jq .version < package.json | tr -d '\"' ", returnStdout: true).trim()
    }

    stage("install") {
        nodejs(nodeJSInstallationName: 'node_16_14_2') {
            sh (script: "npm ci")
        }
    }

    stage("lint") {
        nodejs(nodeJSInstallationName: 'node_16_14_2') {
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
                nodejs(nodeJSInstallationName: 'node_16_14_2') {
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
            
            node("cisanta") {
            
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
                withEnv(readFile('.env').split('\n') as List) {
                    nodejs(nodeJSInstallationName: 'node_16_14_2') {
                        sh (script: "npm ci")
                        sh (script: "export NODE_ENV='test' && export APP_TEST_ACTION='test:unit' && npx gulp -f docker/utils/Gulpfile.js")
                        dir('docker') {
                            sh (script: "cp ../.env .env")
                            sh (script: "export APP_TEST_ACTION='test:unit' && docker-compose build --pull")
                            sh (script: "export APP_TEST_ACTION='test:unit' && docker-compose up --build --abort-on-container-exit test_runner")
                        }
                    }
                }
            }
        },
        'integration_tests': {

            // node("ciath") {
            //     VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
            //     doGenerateSubmoduleConfigurations: false,
            //     submoduleCfg: [],
            //     userRemoteConfigs: [
            //         [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
            //         name: 'origin',
            //         refspec: "${REFSPEC}",
            //         url: 'git@github.com:Atypon-OpenSource/manuscripts-api.git']
            //     ]])

            //     sh (script: "npm ci")
            //     sh (script: "./bin/set-package-json-version.sh")
            //     sh (script: "./bin/build-env.js .env.example > .env")
            //     withCredentials([string(credentialsId: 'PRESSROOM_APIKEY', variable: 'PRESSROOM_APIKEY')]) {
            //         withEnv(readFile('.env').split('\n') as List) {
            //             nodejs(nodeJSInstallationName: 'node_16_14_2') {
            //                 sh (script: "npm ci")
            //                 sh (script: "export NODE_ENV='test' && npx gulp -f docker/utils/Gulpfile.js")
            //                 dir('docker') {
            //                     sh (script: "cp ../.env .env")
            //                     sh (script: "export NODE_ENV='test' && export APP_TEST_ACTION='test:int' && docker-compose build --pull")
            //                     sh (script: "docker-compose up -d postgres")
            //                     env.APP_DATABASE_URL="postgresql://postgres:admin@localhost:5432/test"
            //                     sh (script: """
            //                     export NODE_ENV='test' \
            //                     && export APP_TEST_ACTION='test:int' \
            //                     && export APP_DATABASE_URL='postgresql://postgres:admin@localhost:5432/test' \
            //                     && npm run migrate-prisma
            //                     """)

            //                     sh (script: """
            //                     export NODE_ENV='test' \
            //                     && export APP_TEST_ACTION='test:int' \
            //                     && export APP_PRESSROOM_APIKEY=${PRESSROOM_APIKEY} \
            //                     && export APP_PRESSROOM_BASE_URL='https://pressroom-js-dev.manuscripts.io' \
            //                     && docker-compose up --build --abort-on-container-exit test_runner
            //                     """)
            //                 }
            //             }
            //         }
            //     }

            // }
        },
        failFast: false
    ])

    stage("Build docker image") {
        // build docker image with native docker 
        sh("""
        docker build -t ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG} -f docker/app/Dockerfile .
        """)

        // docker.withServer('unix:///var/run/docker-ci.sock') {
        //     app = docker.build("${DOCKER_IMAGE}:${IMG_TAG}", "-f docker/app/Dockerfile .")
        // }
        echo "Pushing ${DOCKER_IMAGE}:${IMG_TAG}"
        // push to registry
        sh("""
        docker push ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG}
        """)

        // docker.withRegistry("https://${REGISTRY}") {
        //     app.push();
        //     app.push('latest');
        // }
    }
    }
}

