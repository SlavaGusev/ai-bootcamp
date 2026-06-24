# Playwright API Tests

This folder contains the Playwright API test project for the authentication scenarios exposed by the AuthService login endpoint.

## Project Structure

```text
tests/
├── helpers/
│   ├── auth-api.ts          # Shared login request helper
│   ├── docker.ts            # Docker lifecycle helper for container-backed tests
│   ├── logs-mcp.ts          # MCP client helper for querying logs-server tools
│   └── npm.ts               # Helpers to run break/restore scripts
│   └── test-data.ts         # Shared user seeding and log truncation helpers
├── scripts/
│   └── start-server.js      # Initializes DB, restores test user, starts app on port 3100
├── specs/
│   ├── auth.spec.ts         # Four requested authentication scenarios
│   └── logs-mcp.spec.ts     # Docker plus MCP log-analysis scenarios
└── README.md                # Test project guide
```

## Scenarios Covered

1. Successful authentication for `test@test.com` / `password123`
2. Blocked user detection after `npm run break-user test@test.com`
3. Invalid credentials with a wrong password
4. Non-existent user with the same `401` response as invalid credentials
5. Docker-backed log analysis for blocked users, invalid passwords, missing credentials, and repeated failures via MCP

## MCP Log Analysis Coverage

- Goal: Train AI agent to parse logs and find failure patterns
- Approach: Trigger various failures against the Dockerized app and analyze `logs/app.log` through the MCP logs server
- Skills: JSON parsing, pattern matching, anomaly detection

The `logs-mcp.spec.ts` suite does the following in each scenario:

1. Connects to the application running in Docker on port `3000`
2. Creates or updates test data in the shared SQLite database
3. Queries `src/mcp/logs-server.ts` over MCP stdio to read/search `logs/app.log`
4. Verifies failure signatures in structured JSON logs

## How Local Runs Work

`npm test` uses Playwright's `webServer` support to run `npm run test:server`.

That startup script:

1. Runs `npm run init-db`
2. Runs `npm run restore-user test@test.com`
3. Starts the Express app on port `3100`

The tests then call `POST /login` through Playwright's request context.

## Run Tests Locally

Prerequisites:

- Node.js 18+
- npm installed

Commands:

```bash
npm install
npm test
```

For CI-style output:

```bash
npm run test:ci
```

For the Docker plus MCP log-analysis scenarios only:

```bash
npm run test:logs:mcp
```

## Run Tests In Docker

The Docker test flow uses a dedicated `auth-service-tests` service built from the `test-runner` stage in the root Dockerfile.

Command:

```bash
npm run test:docker
```

That command runs:

1. A container with dev dependencies and Playwright test runner installed
2. The same `npm run test:ci` command used locally
3. The same startup sequence that initializes the DB and restores the primary test user before the suite starts

## Notes

- The test suite is configured to use a single worker because Scenario 2 mutates shared database state.
- Browser installation is skipped because this is an API-only Playwright project.
- The application under test runs on port `3100` during tests so local development on port `3000` is unaffected.