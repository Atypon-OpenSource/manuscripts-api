module.exports = {
    "verbose": true,
    "testURL": 'http://localhost',
    "testEnvironment": "node",
    "testMatch": [
        "**/test/suites/eventing/*.ts"
    ],
    "testRunner": "jest-circus/runner",
    "moduleFileExtensions": [
        "ts",
        "js",
        "json",
        "node"
    ]
}
