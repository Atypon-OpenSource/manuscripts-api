pipeline {
    agent none
    parameters {
        string(name: 'GIT_BRANCH', defaultValue: 'master')
        booleanParam(name: 'PUBLISH', defaultValue: false)
    }
    stages {
        stage('Build') {
            agent {
                docker {
                    image 'node:18'
                    args '--userns=host \
                          --security-opt seccomp:unconfined \
                          -v /home/ci/.cache/yarn:/.cache/yarn \
                          -v /home/ci/.npm:/.npm'
                }
            }
            steps {
                sh 'yarn install --non-interactive --frozen-lockfile'
                sh 'yarn test:unit'
                sh 'yarn build'
            }
        }
        stage ('Docker') {
            agent any
            environment {
                REGISTRY = "${env.PRIVATE_ARTIFACT_REGISTRY}"
                DOCKER_IMAGE = 'manuscripts/api'
                IMG_TAG = getImgTag(params.GIT_BRANCH)
            }
            stages {
                stage('Build docker image') {
                    steps {
                        sh 'docker build -t ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG} .'
                    }
                }
                stage('Publish docker image') {
                    when {
                        expression { params.PUBLISH == true }
                    }
                    steps {
                        sh 'docker push ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG}'
                        sh 'docker push ${REGISTRY}/${DOCKER_IMAGE}'
                    }
                }
            }
        }
    }
}

def getImgTag(branch) {
    if ('master'.equals(branch)) {
        return sh(script: 'jq .version < package.json | tr -d \\"', returnStdout: true).trim();
    } else {
        def commit = env.GIT_COMMIT
        return branch + '-' + commit.substring(0, 6);
    }
}
