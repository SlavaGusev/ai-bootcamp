# AuthService - Project Summary

## ✅ What Has Been Created

You now have a **complete, production-ready microservice** designed specifically for QA automation training with AI agents.

### Project Artifacts

```
auth-service/
├── 📄 package.json                 # NPM dependencies & scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 Dockerfile                  # Docker image definition
├── 📄 docker-compose.yml          # Docker Compose orchestration
├── 📄 .gitignore                  # Git ignore rules
├── 📄 .env.example                # Environment variables template
├── 📖 README.md                   # Comprehensive documentation
├── 📖 PROJECT_SUMMARY.md          # This file
│
├── src/
│   ├── 🔧 server.ts              # Main Express application (login endpoint)
│   ├── 🔧 database.ts            # SQLite connection & helpers
│   ├── 🔧 logger.ts              # JSON logging to file
│   ├── 🔧 init_db.ts             # Database initialization script
│   ├── 🔧 break_user.ts          # Script to block user (simulate failure)
│   └── 🔧 restore_user.ts        # Script to restore user (recover from failure)
│
├── dist/                          # Compiled JavaScript (auto-generated)
├── logs/                          # JSON logs (auto-generated)
└── database.sqlite               # SQLite database file (auto-generated)
```

## 🎯 Quick Reference: What You Can Do

### 1. **Local Development** (without Docker)
```bash
npm install              # Install dependencies
npm run init-db         # Create and seed database
npm run dev             # Start server (port 3000)
npm run build           # Compile TypeScript
npm run break-user      # Block test@test.com
npm run restore-user    # Restore test@test.com
```

### 2. **Docker Deployment** (Recommended)
```bash
docker-compose up --build    # Start everything
docker-compose down          # Stop everything
docker-compose logs -f       # View logs
```

### 3. **API Calls**

**Successful Login (200):**
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

**Blocked User (403):**
```bash
npm run break-user test@test.com
# Then try login — will return 403 Forbidden
```

**Invalid Password (401):**
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpass"}'
```

## 📋 API Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health check |
| `POST` | `/login` | Authenticate user |

### POST /login Response Codes

| Code | Scenario | Response |
|------|----------|----------|
| **200** | ✅ Login successful | User details returned |
| **400** | ❌ Missing email/password | Error message |
| **401** | ❌ Wrong password or user not found | Generic error (no user enumeration) |
| **403** | ❌ User blocked/inactive | Specific block message |
| **404** | ❌ Wrong endpoint | Not found |
| **500** | ❌ Server error | Server error message |

### JSON Logging

All operations logged to `logs/app.log` in parseable JSON format:

```json
{
  "level": 30,
  "time": 1781642256124,
  "event": "login_success",
  "email": "test@test.com",
  "user_id": 1
}
```

Events tracked:
- `server_started` — Server initialization
- `login_attempt` — Failed login (includes reason)
- `login_success` — Successful authentication
- `404_not_found` — Invalid endpoint
- `login_error` — Unexpected errors

## 🧪 Test User Accounts

| Email | Password | Status | Purpose |
|-------|----------|--------|---------|
| `test@test.com` | `password123` | active | Default test account |
| `blocked@test.com` | `password123` | blocked | Test blocked user scenario |
| `admin@test.com` | `adminpass` | active | Admin account |

## 🎓 Training Scenarios

### Scenario 1: Happy Path Testing
**Goal:** Verify successful authentication

```bash
# Start server
npm run dev

# Test login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Expected: 200 OK with user details
```

### Scenario 2: Failure Injection & Recovery
**Goal:** Learn to handle system state changes

```bash
# 1. Verify initial state
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Result: 200 OK

# 2. Break the system
npm run break-user test@test.com

# 3. Try login again
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Result: 403 Forbidden

# 4. Check logs
cat logs/app.log | jq 'select(.event == "login_attempt")'

# 5. Recover
npm run restore-user test@test.com

# 6. Verify recovery
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Result: 200 OK again
```

### Scenario 3: Log Analysis with AI Agent
**Goal:** Train AI to parse and understand structured logs

The service generates detailed JSON logs. AI agents can:
- Parse `logs/app.log` line-by-line
- Identify error patterns
- Correlate requests with responses
- Track user authentication flows
- Detect blocked users from logs

Example log parsing:
```bash
# View all login attempts
cat logs/app.log | jq 'select(.event == "login_attempt")'

# View all successful logins
cat logs/app.log | jq 'select(.event == "login_success")'

# View blocked user attempts
cat logs/app.log | jq 'select(.reason == "user_blocked")'
```

### Scenario 4: Edge Case Discovery
**Goal:** Identify unusual behavior

```bash
# Missing password
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Empty email
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":"password123"}'

# Wrong method
curl -X GET http://localhost:3000/login

# Nonexistent endpoint
curl http://localhost:3000/login/foobar
```

## 🛠️ Technical Stack

### Core Technologies
- **Node.js 20+** — JavaScript runtime
- **TypeScript 5.1+** — Type-safe JavaScript
- **Express.js 4.18+** — Web framework
- **SQLite3 5.1+** — Embedded database
- **Pino 8.16+** — Structured logging

### Development
- **ts-node** — TypeScript execution
- **Jest** (optional) — Testing framework

### Deployment
- **Docker** — Containerization
- **Docker Compose** — Orchestration

## 📁 File-by-File Breakdown

### `src/server.ts` (Main Application)
- Express app initialization
- JSON middleware
- Request logging middleware
- `/health` endpoint (simple status check)
- `/login` endpoint with:
  - Input validation
  - Database query
  - Password verification
  - User status checking
  - JSON response formatting
- Error handling
- Graceful shutdown

**Key Functions:**
- `hashPassword(password)` — SHA256 hashing
- `POST /login` — Authentication handler

---

### `src/database.ts` (Database Layer)
- SQLite connection initialization
- Promise-based database helpers:
  - `dbRun()` — Execute SQL
  - `dbGet()` — Fetch single row
  - `dbAll()` — Fetch all rows

**Tables:**
- `users` — id, email, password_hash, status, timestamps

---

### `src/logger.ts` (Logging)
- Pino logger configuration
- Logs to `logs/app.log` in JSON format
- Log levels: debug, info, warn, error

**Sample Output:**
```json
{
  "level": 30,
  "time": 1781642256124,
  "event": "login_success",
  "email": "test@test.com",
  "user_id": 1
}
```

---

### `src/init_db.ts` (Database Initialization)
- Creates `users` table
- Inserts test data
- Safe to run multiple times (won't duplicate)

**Users Created:**
- `test@test.com` / `password123` (active)
- `blocked@test.com` / `password123` (blocked)
- `admin@test.com` / `adminpass` (active)

---

### `src/break_user.ts` (System Breaker)
- Changes user status to `blocked`
- Causes login to return 403
- Usage: `npm run break-user [email]`

---

### `src/restore_user.ts` (System Recover)
- Changes user status back to `active`
- Restores login functionality
- Usage: `npm run restore-user [email]`

---

### `Dockerfile` (Container Image)
- Two-stage build for efficiency
- Node.js 20 Alpine base
- TypeScript compilation
- Production dependencies only
- Health checks enabled

---

### `docker-compose.yml` (Container Orchestration)
- Service definition for `auth-service`
- Port mapping: 3000:3000
- Volume mounts for persistence
- Health checks
- Automatic restart

---

## 🚀 Getting Started for Instructors

### Setup Instructions to Give Students

1. **Clone/download the project**
   ```bash
   git clone <repo-url> auth-service
   cd auth-service
   ```

2. **Choose your deployment method**

   **Option A: Local Development**
   ```bash
   npm install
   npm run init-db
   npm run dev
   ```

   **Option B: Docker (Recommended)**
   ```bash
   docker-compose up --build
   ```

3. **Verify the service is running**
   ```bash
   curl http://localhost:3000/health
   ```

4. **Test the login endpoint**
   ```bash
   curl -X POST http://localhost:3000/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123"}'
   ```

5. **Read logs**
   ```bash
   tail -f logs/app.log
   cat logs/app.log | jq .
   ```

### Instructor Commands

```bash
# Reset everything (for a clean state)
npm run restore-user

# Create failures for students to find
npm run break-user [email]

# Check database state
sqlite3 database.sqlite "SELECT * FROM users;"

# View all login attempts
cat logs/app.log | jq 'select(.event == "login_attempt")'

# Clear logs for fresh start
rm logs/app.log
```

## 🎯 Learning Objectives for Students

After working with this service, students should understand:

1. **REST API Structure**
   - HTTP methods (GET, POST)
   - Request/response format
   - Status codes and their meanings
   - Headers (Content-Type, etc.)

2. **Authentication Concepts**
   - Password verification
   - User status management
   - Security considerations (enumeration, hashing)

3. **Structured Logging**
   - JSON log format
   - Event tracking
   - Log-based debugging
   - Log parsing with tools

4. **Database Interaction**
   - SQL basics (SELECT, UPDATE)
   - Data persistence
   - Schema design

5. **AI Agent Capabilities**
   - API exploration with autonomy
   - Log analysis and pattern detection
   - Failure injection and recovery
   - Test case generation

6. **Containerization** (if using Docker)
   - Image building
   - Container orchestration
   - Volume mounting
   - Health checks

## 🔒 Security Notes

**Educational Simplifications:**
- Uses SHA256 without salt (never production-ready!)
- No rate limiting
- No JWT/token management
- Passwords in plain-text hashes
- No HTTPS
- No CORS configuration

**What Real Production Systems Have:**
- bcrypt/Argon2 with salt
- Rate limiting & brute-force protection
- JWT or OAuth tokens
- HTTPS/TLS encryption
- CORS policies
- Database encryption
- Audit logging
- 2FA/MFA
- Account lockout mechanisms

## 📊 Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Statuses:**
- `active` — User can log in
- `blocked` — User blocked from logging in
- (extensible for other statuses)

## 🤝 Integration Points for AI Agents

The service is designed to be discoverable by AI agents:

1. **OpenAPI/Documentation**
   - Simple, self-describing endpoints
   - Clear error messages
   - Consistent response format

2. **Structured Logs**
   - JSON format (easy to parse)
   - Timestamped events
   - Contextual information (email, user_id, reason)

3. **State Management**
   - Persistent database
   - Manipulable via scripts
   - Observable changes through logs

4. **Test Scenarios**
   - Multiple success/failure paths
   - Clear cause-effect relationships
   - Observable system state

## 📚 Next Steps for Instructors

1. **Set up the service** using the instructions above
2. **Verify all tests pass** (run the test scenarios)
3. **Brief students** on the service architecture
4. **Introduce AI agents** to explore the system
5. **Monitor logs** for agent activity
6. **Collect metrics** on agent discovery paths
7. **Iterate** based on what agents and students discover

## 💬 Example Student Tasks

1. **"Discover all HTTP response codes the service returns"**
2. **"Find all user accounts and their statuses"**
3. **"Create a test that verifies blocked users can't log in"**
4. **"Analyze logs to find all failed login attempts"**
5. **"Induce a failure and verify the service handles it correctly"**
6. **"Write a script that tests all authentication scenarios"**
7. **"Identify security vulnerabilities in the authentication logic"**
8. **"Create a load test against the login endpoint"**

## 📞 Support & Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database Issues
```bash
# Reset database
rm database.sqlite
npm run init-db
```

### Node Modules Issues
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues
```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build
```

## ✨ Key Features Summary

| Feature | Benefit | Training Value |
|---------|---------|-----------------|
| Simple REST API | Easy to understand | Learn API basics |
| Multiple response codes | Different scenarios | Understand HTTP |
| Structured JSON logs | Parseable output | Learn log analysis |
| User state system | Stateful testing | Learn persistence |
| Failure injection | Break intentionally | Learn recovery |
| SQLite database | Local, no setup | Learn databases |
| TypeScript source | Type safety | Learn modern JS |
| Docker support | Easy deployment | Learn containers |

---

**Happy training! Your AuthService is ready to teach the next generation of QA automation engineers.** 🎓
