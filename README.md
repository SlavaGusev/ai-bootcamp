# AuthService - Educational Microservice for QA Automation Training

Welcome to **AuthService**, a simple but realistic authentication microservice designed for training QA automation engineers in working with AI agents to discover bugs and issues in systems.

## 📋 Project Overview

AuthService is a Node.js/Express application that implements a basic authentication system with a SQLite database. The service intentionally exposes different response codes and scenarios for students to explore and test with autonomous agents.

### Key Features

- **Simple REST API** with a single `/login` endpoint
- **User status management** (active, blocked)
- **Structured JSON logging** for easy parsing by AI agents
- **SQLite database** with pre-populated test data
- **Docker support** for easy deployment
- **Test data manipulation scripts** to simulate system failures

## 🏗️ Project Structure

```
auth-service/
├── src/
│   ├── server.ts          # Main Express application
│   ├── database.ts        # Database connection and helpers
│   ├── logger.ts          # JSON logging configuration
│   ├── init_db.ts         # Database initialization script
│   ├── break_user.ts      # Script to block a user (simulate failure)
│   └── restore_user.ts    # Script to restore a user
├── logs/                  # JSON log files (created at runtime)
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose configuration
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for local development)
- **npm** 9+ (for local development)
- **Docker & Docker Compose** (for containerized deployment)

### Option 1: Local Development Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Initialize Database

```bash
npm run init-db
```

This will:
- Create the SQLite database (`database.sqlite`)
- Create the `users` table
- Add test users:
  - `test@test.com` (password: `password123`, status: `active`)
  - `blocked@test.com` (password: `password123`, status: `blocked`)
  - `admin@test.com` (password: `adminpass`, status: `active`)

#### 3. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Option 2: Docker Setup (Recommended for Testing)

#### 1. Build and Start with Docker Compose

```bash
docker-compose up --build
```

The service will:
- Build the Docker image
- Initialize the database automatically
- Start listening on `http://localhost:3000`

#### 2. View Logs

```bash
# View service logs
docker-compose logs -f auth-service

# View application logs
tail -f logs/app.log
```

#### 3. Stop the Service

```bash
docker-compose down
```

## MCP Log Server

This workspace now includes an MCP server that reads application logs from the host `logs/` directory mounted into the Docker container as `/app/logs`.

### What it exposes

- `docker_app_status`: inspect the `auth-service` container and show mount details
- `list_application_logs`: list log files available under `logs/`
- `read_application_log`: tail a selected log file such as `app.log`
- `search_application_logs`: search one or all log files for matching text

### Run it manually

```bash
npm run mcp:logs:dev
```

For a built run:

```bash
npm run build
npm run mcp:logs
```

### VS Code MCP configuration

The workspace includes `.vscode/mcp.json`, which starts the MCP server over stdio with these defaults:

- `DOCKER_CONTAINER_NAME=auth-service`
- `LOGS_DIR=logs`
- `CONTAINER_LOGS_DIR=/app/logs`

Start the Dockerized app first so the mounted log files are populated:

```bash
docker compose up --build
```

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Login

```bash
POST /login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "password123"
}
```

#### Response Scenarios

**1. Successful Login (200 OK)**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password123"}'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@test.com",
    "status": "active"
  }
}
```

**2. User Blocked (403 Forbidden)**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "blocked@test.com", "password": "password123"}'
```

Response:
```json
{
  "error": "User account is blocked"
}
```

**3. Invalid Password (401 Unauthorized)**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "wrongpassword"}'
```

Response:
```json
{
  "error": "Invalid email or password"
}
```

**4. User Not Found (401 Unauthorized)**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@test.com", "password": "password123"}'
```

Response:
```json
{
  "error": "Invalid email or password"
}
```

**5. Missing Credentials (400 Bad Request)**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}'
```

Response:
```json
{
  "error": "Email and password are required"
}
```

## 🔨 Database Management Scripts

### Initialize Database

```bash
npm run init-db
```

Creates tables and adds test data. Safe to run multiple times (won't duplicate existing data).

### Block a User (Simulate Failure)

```bash
npm run break-user [email]
```

Examples:
```bash
# Block the default test user
npm run break-user

# Block a specific user
npm run break-user blocked@test.com
```

**Effect:** Login attempts with a blocked user return **403 Forbidden**.

### Restore a User

```bash
npm run restore-user [email]
```

Examples:
```bash
# Restore the default test user
npm run restore-user

# Restore a specific user
npm run restore-user test@test.com
```

**Effect:** Restores user status to `active` so login works again.

## 📊 JSON Logging Format

All logs are written to `logs/app.log` in JSON format, making them easy to parse with AI agents.

### Log Entry Examples

**Successful Login:**
```json
{
  "level": 30,
  "time": 1642262445123,
  "event": "login_success",
  "email": "test@test.com",
  "user_id": 1
}
```

**Invalid Password:**
```json
{
  "level": 40,
  "time": 1642262445456,
  "event": "login_attempt",
  "email": "test@test.com",
  "reason": "invalid_password"
}
```

**User Blocked:**
```json
{
  "level": 40,
  "time": 1642262445789,
  "event": "login_attempt",
  "email": "blocked@test.com",
  "reason": "user_blocked",
  "status": "blocked"
}
```

**Server Started:**
```json
{
  "level": 30,
  "time": 1642262445000,
  "event": "server_started",
  "port": 3000,
  "environment": "development"
}
```

## 🎓 Training Scenarios for QA Automation

### Scenario 1: Successful Authentication Flow
- **Goal:** Verify successful login returns 200 and correct user data
- **Test Data:** `test@test.com` / `password123`
- **Expected:** 200 OK with user details

### Scenario 2: Blocked User Detection
- **Goal:** Identify when a user is blocked and appropriate error is returned
- **Setup:** Run `npm run break-user test@test.com`
- **Test Data:** `test@test.com` / `password123`
- **Expected:** 403 Forbidden with "User account is blocked" message
- **Recovery:** Run `npm run restore-user test@test.com`

### Scenario 3: Invalid Credentials
- **Goal:** Verify system rejects incorrect passwords
- **Test Data:** `test@test.com` / `wrongpassword`
- **Expected:** 401 Unauthorized with "Invalid email or password" message

### Scenario 4: Non-existent User
- **Goal:** Ensure system handles missing users gracefully
- **Test Data:** `nonexistent@test.com` / `password123`
- **Expected:** 401 Unauthorized (same as invalid password - no user enumeration!)

### Scenario 5: Log Analysis
- **Goal:** Train AI agent to parse logs and find failure patterns
- **Approach:** Trigger various failures and analyze `logs/app.log`
- **Skills:** JSON parsing, pattern matching, anomaly detection

## 🔍 Building Tests with AI Agents

### What to Explore with Agents

1. **Request/Response Mapping**
   - Different email/password combinations
   - Various HTTP status codes returned
   - Error message patterns

2. **Stateful Behavior**
   - User status transitions (active → blocked → active)
   - Database state verification
   - Persistence across restarts

3. **Log Parsing**
   - JSON log structure analysis
   - Event tracing (attempt → success/failure)
   - Timing analysis

4. **Edge Cases**
   - Empty strings
   - Null values
   - Missing fields
   - SQL injection attempts
   - Very long inputs

## 🛠️ Development

### Build TypeScript

```bash
npm run build
```

Output goes to `dist/` directory.

### Development Server with Auto-reload

```bash
npm run dev
```

Uses `ts-node` for direct TypeScript execution.

## 🐳 Docker Commands Reference

```bash
# Build and start
docker-compose up --build

# Start without rebuild
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f auth-service

# Execute command in running container
docker-compose exec auth-service npm run restore-user test@test.com

# Remove everything (containers, volumes, networks)
docker-compose down -v
```

## 📝 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.1+ |
| Framework | Express.js | 4.18+ |
| Database | SQLite3 | 5.1+ |
| Logging | Pino | 8.16+ |
| Package Manager | npm | 9+ |
| Containerization | Docker | Latest |

## 🔐 Security Notes for Training

⚠️ **IMPORTANT:** This service uses simplified password hashing (SHA256 without salt) for educational purposes only. **Never use this in production!** 

Production systems should use:
- bcrypt with salting
- Argon2
- PBKDF2
- Other industry-standard algorithms

This is intentionally simple so students can focus on test automation, not cryptography.

## 📚 References for AI Agent Training

- [Express.js Documentation](https://expressjs.com/)
- [SQLite3 Documentation](https://www.sqlite.org/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc9110.html#overview.of.status.codes)
- [JSON Format](https://www.json.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📧 Support

For questions or improvements to this training service, please contact the QA Training Team.

## 📄 License

MIT License - Feel free to use and modify for educational purposes.

---

**Happy Testing! 🎯**
