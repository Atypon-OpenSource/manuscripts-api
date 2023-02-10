#! /usr/bin/groovy
node {
    REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"
    stage("Checkout") {
        // keep the original branch name before the checkout step overrides it
        if (env.GIT_BRANCH) {
            BRANCH="$GIT_BRANCH"
            echo "BRANCH: $BRANCH"
        }
        VARS = checkout scm
        echo "VARS: $VARS"
    }

    stage("Build") {
        nodejs(nodeJSInstallationName: 'node_16_14_2') {
            sh (script: "yarn install --non-interactive --frozen-lock-file")
            sh (script: "yarn build")
            sh (script: "yarn test:unit")
        }
    }

    stage("Build docker image") {
        sh("""
            docker build -f docker/app/Dockerfile .
            """)
    }
}
