pipeline {
    agent none
    parameters {
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
                DOCKER_IMAGE = 'manuscripts/api'
                IMG_TAG = getImgTag(env)
            }
            stages {
                stage('Build docker image') {
                    steps {
                        sh 'docker build -t ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG} -f docker/app/Dockerfile .'
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

def getImgTag(env) {
    def branch = env.GIT_LOCAL_BRANCH;
    def commit = env.GIT_COMMIT;
    if ('master'.equals(branch)) {
        return sh('jq .version < package.json | tr -d \"').trim();
    } else {
        return branch + '-' + commit.substring(0, 6);
    }
}
