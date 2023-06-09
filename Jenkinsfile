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
                NAME = 'manuscripts/api'
                TAG = getImageTag(params.GIT_BRANCH)
                GROUP_TAG = getImageGroupTag(params.GIT_BRANCH)
            }
            stages {
                stage('Build docker image') {
                    steps {
                        sh 'docker build -t ${REGISTRY}/${NAME}:${TAG} -t ${REGISTRY}/${NAME}:${GROUP_TAG} .'
                    }
                }
                stage('Publish docker image') {
                    when {
                        expression { params.PUBLISH == true }
                    }
                    steps {
                        sh 'docker push --all-tags ${REGISTRY}/${NAME}:${TAG}'
                    }
                }
            }
        }
    }
}

def getImageTag(branch) {
    if ('master'.equals(branch)) {
        return sh(script: 'jq .version < package.json | tr -d \\"', returnStdout: true).trim();
    } else {
        def commit = env.GIT_COMMIT
        return commit.substring(0, 9);
    }
}

def getImageGroupTag(branch) {
    if ('master'.equals(branch)) {
        return 'latest';
    } else {
        return branch;
    }
}
