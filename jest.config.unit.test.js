module.exports = {
    "verbose": true,
    "setupFiles": [
      "<rootDir>/test/utilities/configMock.ts"
    ],
    "testURL": 'http://localhost',
    "testEnvironment": "node",
    "testMatch": [
        "**/test/suites/unit/**/*.ts",
        "**/test/suites/unit+integration/**/*.ts",
    ],
    "testRunner": "jest-circus/runner",
    "moduleFileExtensions": [
        "ts",
        "js",
        "json",
        "node"
    ],
    "coverageDirectory": "coverage/unit",
    "coverageThreshold": {
        "global": {
            "branches": 87,
            "functions": 89,
            "lines": 90
        }
    },
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/index.ts",
        "!src/Config/*.ts",
        "!src/Errors.ts",
        "!src/Controller/BaseController.ts",
        "!src/Controller/**/*Route.ts",
        "!src/Controller/**/*Schema.ts",
        "!src/Auth/Passport/**",
        "!src/Controller/RouteLoader.ts",
        "!src/**/Interfaces/*",
        "!src/Server/**",
        "!src/Utilities/Logger/**",
        "!src/Utilities/fs-promise.ts",
        "!src/DataAccess/AccessControlRepository.ts",
        "!src/DataAccess/SQLDatabase.ts",
        "!src/DataAccess/DatabaseIndices.ts",
        "!src/DataAccess/**Repository/**",
        "!src/DataAccess/QueryKind.ts",
        "!src/DomainServices/UserActivity/UserActivityTrackingService.ts",
        "!src/DomainServices/External/AWS.ts",
        "!src/DataAccess/EventingFunctions/**.ts",
        "!src/DomainServices/Pressroom/PressroomService.ts",
        "!src/DomainServices/Shackles/ShacklesService.ts",
        "!src/DomainServices/Expiration/ExpirationService.ts"
    ]
}
