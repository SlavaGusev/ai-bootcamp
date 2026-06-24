# AuthService - Architecture & Design

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client / AI Agent                         │
│            (Makes HTTP requests, parses responses)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js Server                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET  /health        → Server health check                  │ │
│  │ POST /login         → Authenticate user (main endpoint)    │ │
│  │                                                             │ │
│  │ Request Logger Middleware (logs all requests)              │ │
│  │ JSON Response Formatter (consistent output)                │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌────────────┐        ┌──────────────┐
    │   SQLite   │        │ Pino Logger  │
    │ Database   │        │              │
    │            │        │ logs/app.log │
    │ users      │        │ (JSON format)│
    │ table      │        └──────────────┘
    └────────────┘
```

## Request/Response Flow: Login Endpoint

```
POST /login with {"email": "...", "password": "..."}
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Validate Input                   │
│    - email present?                 │
│    - password present?              │
├─────────────────────────────────────┤
│ ❌ NO → 400 Bad Request             │
│ ✅ YES → Continue to step 2        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Query Database                   │
│    SELECT * FROM users              │
│    WHERE email = ?                  │
├─────────────────────────────────────┤
│ ❌ NOT FOUND → 401 Unauthorized     │
│ ✅ FOUND → Continue to step 3      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Verify Password                  │
│    password_hash = SHA256(password) │
│    matches DB hash?                 │
├─────────────────────────────────────┤
│ ❌ NO → 401 Unauthorized            │
│ ✅ YES → Continue to step 4        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Check User Status                │
│    status === ?                     │
├─────────────────────────────────────┤
│ 'active'   → 200 OK (success!)      │
│ 'blocked'  → 403 Forbidden          │
│ other      → 403 Forbidden          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Log & Respond                    │
│    Write event to logs/app.log      │
│    Return appropriate response      │
└─────────────────────────────────────┘
```

## Database Schema

```
┌──────────────────────────────────────────┐
│              users TABLE                 │
├──────────────────────────────────────────┤
│ Column        │ Type     │ Constraints   │
├───────────────┼──────────┼───────────────┤
│ id            │ INTEGER  │ PRIMARY KEY   │
│               │          │ AUTO_INCREMENT│
├───────────────┼──────────┼───────────────┤
│ email         │ TEXT     │ UNIQUE, NOT   │
│               │          │ NULL          │
├───────────────┼──────────┼───────────────┤
│ password_hash │ TEXT     │ NOT NULL      │
├───────────────┼──────────┼───────────────┤
│ status        │ TEXT     │ DEFAULT:      │
│               │          │ 'active'      │
├───────────────┼──────────┼───────────────┤
│ created_at    │ DATETIME │ DEFAULT: NOW  │
├───────────────┼──────────┼───────────────┤
│ updated_at    │ DATETIME │ DEFAULT: NOW  │
└──────────────────────────────────────────┘

Indexes: UNIQUE(email)

Example Rows:
┌────┬──────────────────┬────────────────────────┬──────────┐
│ id │ email            │ password_hash (SHA256) │ status   │
├────┼──────────────────┼────────────────────────┼──────────┤
│ 1  │ test@test.com    │ 8d969eef6ecad3c29a3a│ active   │
│ 2  │ blocked@test.com │ 8d969eef6ecad3c29a3a│ blocked  │
│ 3  │ admin@test.com   │ 8c6976e5b5410415bde9│ active   │
└────┴──────────────────┴────────────────────────┴──────────┘
```

## Logging Architecture

```
┌─────────────────────────────────────┐
│         Logger (Pino)               │
│  ┌───────────────────────────────┐  │
│  │ Configuration                  │  │
│  │ - Level: info (default)        │  │
│  │ - Format: JSON                 │  │
│  │ - Transport: File              │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │
                  ▼
          ┌────────────────┐
          │ logs/app.log   │
          │ (JSON Lines)   │
          └────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ Each line is valid JSON:    │
    │ {                           │
    │   "level": 30,              │
    │   "time": 1781642256124,    │
    │   "event": "login_success", │
    │   "email": "test@...",      │
    │   "user_id": 1              │
    │ }                           │
    └─────────────────────────────┘
```

### Log Events

```
server_started
├─ port: number
├─ environment: string
└─ timestamp: ISO string

login_attempt (failed)
├─ email: string
├─ reason: "user_not_found" | "invalid_password" | "user_blocked" | "invalid_user_status" | "missing_credentials"
└─ status?: string (if blocked)

login_success (200 OK)
├─ email: string
└─ user_id: number

login_error (500)
├─ email: string
└─ error: string

404_not_found
├─ method: string
├─ path: string
└─ timestamp: ISO string

request (all requests)
├─ method: string
├─ path: string
└─ timestamp: ISO string
```

## Failure Modes & Recovery

```
Normal State:
┌────────────────────────────────────────┐
│ test@test.com                          │
│ status: 'active'                       │
│ password_hash: 8d969eef6ecad3c...      │
└────────────────────────────────────────┘
              │
              ▼
    npm run break-user
              │
              ▼
┌────────────────────────────────────────┐
│ test@test.com                          │
│ status: 'blocked'  ◄── CHANGED         │
│ password_hash: 8d969eef6ecad3c...      │
└────────────────────────────────────────┘
              │
       Login attempts now return 403
              │
              ▼
    npm run restore-user
              │
              ▼
┌────────────────────────────────────────┐
│ test@test.com                          │
│ status: 'active'  ◄── RESTORED         │
│ password_hash: 8d969eef6ecad3c...      │
└────────────────────────────────────────┘
              │
       Login works again (200 OK)
```

## Deployment Architectures

### Local Development
```
┌─────────────────────────────────┐
│     Your Computer               │
│  ┌──────────────────────────┐   │
│  │ Node.js Runtime          │   │
│  │  npm run dev             │   │
│  │  ts-node server.ts       │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ database.sqlite          │   │
│  │ logs/app.log             │   │
│  └──────────────────────────┘   │
│         Port: 3000               │
└─────────────────────────────────┘
```

### Docker Single Container
```
┌───────────────────────────────────────────────┐
│            Docker Container                   │
│  ┌─────────────────────────────────────────┐  │
│  │ Node.js 20 Runtime                      │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ npm start (node dist/server.js) │    │  │
│  │  └─────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ database.sqlite (persistent)    │    │  │
│  │  │ logs/app.log (persistent)       │    │  │
│  │  └─────────────────────────────────┘    │  │
│  └─────────────────────────────────────────┘  │
│         Port: 3000 → localhost:3000           │
└───────────────────────────────────────────────┘
```

### Docker Compose Stack
```
┌─────────────────────────────────────────────────┐
│          docker-compose Network                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Service: auth-service                    │  │
│  │  Container: node:20-alpine                │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ npm start                           │  │  │
│  │  │ Port: 3000/tcp                      │  │  │
│  │  │ Health: /health check               │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ Volumes:                            │  │  │
│  │  │  - database.sqlite                  │  │  │
│  │  │  - logs/                            │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│         Exposed: localhost:3000                 │
└─────────────────────────────────────────────────┘
```

## Response Format Consistency

All endpoints follow this pattern:

### Success Response (2xx)
```json
{
  "success": true,
  "message": "User-friendly message",
  "data": { ... },
  "timestamp": "ISO 8601"
}
```

### Error Response (4xx, 5xx)
```json
{
  "error": "Machine-readable error message",
  "timestamp": "ISO 8601"
}
```

## Type Safety with TypeScript

```typescript
// Request body type
interface LoginRequest {
  email: string;
  password: string;
}

// Response types
interface SuccessResponse {
  success: true;
  message: string;
  user: {
    id: number;
    email: string;
    status: string;
  };
}

interface ErrorResponse {
  error: string;
}

// User model
interface User {
  id: number;
  email: string;
  password_hash: string;
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}
```

## Security Considerations

```
┌─────────────────────────────────────────┐
│ Security Feature                        │
├─────────────────────────────────────────┤
│ ✅ Password Hashing                     │
│    (SHA256, no salt - educational only!)│
├─────────────────────────────────────────┤
│ ✅ User Status Checking                 │
│    (blocks blocked accounts)            │
├─────────────────────────────────────────┤
│ ✅ No User Enumeration                  │
│    (same error for all failures)        │
├─────────────────────────────────────────┤
│ ⚠️  No Rate Limiting                    │
│    (unrestricted login attempts)        │
├─────────────────────────────────────────┤
│ ⚠️  No Tokens/Sessions                  │
│    (stateless, no persistence)          │
├─────────────────────────────────────────┤
│ ⚠️  HTTP Only                           │
│    (no encryption in transit)           │
└─────────────────────────────────────────┘
```

## Development Workflow

```
┌─────────────────────────────────────┐
│ Developer Edits src/*.ts            │
└────────────────────┬────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │ Manual Restart              │ Automatic Reload
      ▼                             ▼
npm run dev              (with nodemon/ts-node watch)
      │
      ▼
TypeScript Compilation
(via ts-node)
      │
      ▼
JavaScript Execution
      │
      ▼
Express Server Ready
(listening on port 3000)
      │
      ▼
Ready for Testing
```

## Testing & Validation Pyramid

```
                    ▲
                   /│\
                  / │ \
                 /  │  \  E2E Tests
                /   │   \ (Full scenarios)
               ┌────┴────┐
               │          │
              / Integration \ 
             / Tests (APIs)   \
            ┌────────────────┐
            │                │
           / Unit Tests      \
          / (Functions)       \
         ┌──────────────────┐
         │                  │
        Static Analysis     │
        (TypeScript)        │
        ┌──────────────────┘
```

## CI/CD Pipeline (Future)

```
┌──────────────┐
│ Git Push     │
└────────┬─────┘
         │
         ▼
    ┌────────────┐
    │ Lint TS    │
    └────┬───────┘
         │
         ▼
    ┌────────────┐
    │ Build      │
    └────┬───────┘
         │
         ▼
    ┌────────────┐
    │ Tests      │
    └────┬───────┘
         │
         ▼
    ┌────────────┐
    │ Docker     │
    │ Build      │
    └────┬───────┘
         │
         ▼
    ┌────────────────────┐
    │ Deploy to Registry │
    │ (Docker Hub)       │
    └────────────────────┘
```

---

**Architecture diagram v1.0** — For educational purposes
