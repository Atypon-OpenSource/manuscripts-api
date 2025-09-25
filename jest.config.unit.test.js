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
            "branches": 75,
            "functions": 80,
            "lines": 80
        }
    },
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/index.ts",
        "!src/Config/*.ts",
        "!src/Errors.ts",
        "!src/Controller/BaseController.ts",
        "!src/Controller/WebSocketController.ts",
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
        "!src/DataAccess/**",
        "!src/DomainServices/PressroomService.ts",
        "!src/DomainServices/SocketsService.ts",
        "!src/DomainServices/EventService.ts",
        "!src/DomainServices/DocumentService.ts",
        "!src/Controller/V2/Registration/RegistrationController.ts",
        "!src/util.ts",
    ]
}
