module.exports = {
    "verbose": true,
    "setupFiles": [
      "<rootDir>/test/utilities/configMock.ts"
    ],
    "testEnvironmentOptions": {
        "url": 'http://localhost'
    },
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
            "branches": 80,
            "functions": 83.5,
            "lines": 80
        }
    },
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/index.ts",
        "!src/Config/*.ts",
        "!src/Errors.ts",
        "!src/Controller/BaseController.ts",
        "!src/Controller/InitRouter.ts",
        "!src/Controller/**/Routes.ts",
        "!src/Controller/**/*Route.ts",
        "!src/Controller/**/*Schema.ts",
        "!src/Controller/V2/Config/ConfigController.ts",
        "!src/Auth/Passport/**",
        "!src/Controller/RouteLoader.ts",
        "!src/**/Interfaces/*",
        "!src/Server/**",
        "!src/Utilities/Logger/**",
        "!src/Utilities/Docs/**",
        "!src/Utilities/fs-promise.ts",
        "!src/DataAccess/SQLDatabase.ts",
        "!src/DataAccess/DatabaseIndices.ts",
        "!src/DataAccess/**Repository/**",
        "!src/DataAccess/QueryKind.ts",
        "!src/DomainServices/UserActivity/UserActivityTrackingService.ts",
        "!src/DomainServices/Pressroom/PressroomService.ts",
        "!src/DomainServices/Document/DocumentService.ts",
        "!src/DomainServices/Snapshot/SnapshotService.ts",
        "!src/DomainServices/DocumentHistory/DocumentHistoryService.ts",
        "!src/DomainServices/Shackles/ShacklesService.ts",
        "!src/DomainServices/Expiration/ExpirationService.ts",
    ]
}
