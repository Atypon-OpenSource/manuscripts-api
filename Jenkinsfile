node {
    stage("checkout") {
        echo 'checkout'
    }

    stage("install") {
        echo 'install'
    }

    stage("lint") {
        echo 'lint'
    }

    parallel([
        'run_app': {
            echo 'run_app'
        },
        'unit_tests': {
            echo 'unit_test'
        },
        'integration_tests': {
            echo 'integration_testsss'
        },
        failFast: false
    ])
}

