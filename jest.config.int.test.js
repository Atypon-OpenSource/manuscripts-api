module.exports = {
    "verbose": true,
    "testURL": 'http://localhost',
    "testEnvironment": "node",
    "testMatch": [
        "**/test/suites/integration/**/*.ts",
        "**/test/suites/unit+integration/**/*.ts",
    ],
    "testRunner": "jest-circus/runner",
    "moduleFileExtensions": [
        "ts",
        "js",
        "json",
        "node"
    ],
    "coverageReporters": ["text-summary"],
    "coverageDirectory": "coverage/int",
    "coverageThreshold": {
        "global": {
            "branches": 82,
            "functions": 91,
            "lines": 88
        }
    },
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/index.ts",
        "!src/Config/*.ts",
        "!src/Errors.ts",
        "!src/Controller/V1/Project/ProjectController.ts",
        "!src/Controller/BaseController.ts",
        "!src/Controller/BaseRoute.ts",
        "!src/Controller/**/*Schema.ts",
        "!src/Auth/Passport/Google.ts",
        "!src/Auth/Passport/JWT.ts",
        "!src/Auth/Passport/Passport.ts",
        "!src/Auth/Passport/ScopedJWT.ts",
        "!src/Auth/V1/Interfaces",
        "!src/Controller/RouteLoader.ts",
        "!src/**/Interfaces/*",
        "!src/Server/**",
        "!src/Utilities/**",
        "!src/DataAccess/Database.ts",
        "!src/DataAccess/DatabaseIndices.ts",
        "!src/DataAccess/QueryKind.ts",
        "!src/Auth/Passport/AuthStrategy.ts",
        "!src/Config/**",
        "!src/DIContainer/DIContainer.ts",
        "!src/DataAccess/EventingFunctions/*.ts",
        "!src/DataAccess/ProjectMementoRepository/ProjectMementoRepository.ts",
        "!src/DataAccess/UserCollaboratorRepository/UserCollaboratorRepository.ts",
        "!src/DataAccess/ProjectSummaryRepository/ProjectSummaryRepository.ts",
        "!src/DataAccess/ExternalFileRepository/ExternalFileRepository.ts"
    ]
}
