# 🚀 Quick Start Guide - AuthService

## 30-Second Setup

### Option 1: Docker (Easiest)
```bash
docker-compose up --build
# Service ready at http://localhost:3000
```

### Option 2: Local Node.js
```bash
npm install
npm run init-db
npm run dev
# Service ready at http://localhost:3000
```

---

## 5-Minute Verification

### Test 1: Health Check
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"..."}
```

### Test 2: Successful Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Response: 200 OK
```

### Test 3: Blocked User
```bash
npm run break-user test@test.com

curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Response: 403 Forbidden
```

### Test 4: View Logs
```bash
cat logs/app.log | jq .
# View all JSON-formatted logs
```

### Test 5: Restore User
```bash
npm run restore-user test@test.com

curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Response: 200 OK again
```

---

## Test Accounts

| Email | Password | Status | Use Case |
|-------|----------|--------|----------|
| `test@test.com` | `password123` | active | Primary test account |
| `blocked@test.com` | `password123` | blocked | Test blocked user |
| `admin@test.com` | `adminpass` | active | Admin tests |

---

## Available Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Start dev server (auto-reload)
npm run start          # Run compiled server
npm run init-db        # Initialize database (idempotent)
npm run break-user     # Block test@test.com
npm run restore-user   # Unblock test@test.com
```

---

## Docker Commands

```bash
docker-compose up --build      # Build and start
docker-compose up              # Start (no rebuild)
docker-compose down            # Stop and remove
docker-compose logs -f         # View logs
docker-compose exec auth-service npm run restore-user  # Run command in container
```

---

## File Structure

```
auth-service/
├── src/
│   ├── server.ts           # Main app
│   ├── database.ts         # DB helpers
│   ├── logger.ts           # JSON logging
│   ├── init_db.ts          # DB setup
│   ├── break_user.ts       # Break system
│   └── restore_user.ts     # Recover system
├── Dockerfile              # Container image
├── docker-compose.yml      # Container orchestration
├── package.json            # Dependencies
├── README.md               # Full docs
├── ARCHITECTURE.md         # Design docs
└── PROJECT_SUMMARY.md      # Detailed guide
```

---

## Key Features for AI Agents

✅ **RESTful API** — Easy to call and test
✅ **JSON Responses** — Structured, parseable output  
✅ **JSON Logs** — Event-based, machine-readable
✅ **Multiple Status Codes** — Different scenarios (200, 401, 403, 400, 404, 500)
✅ **Failure Injection** — Break/restore functionality
✅ **SQLite Database** — Observable state
✅ **Clear Error Messages** — Debug-friendly
✅ **TypeScript** — Type-safe, readable code

---

## Common Issues

**Port 3000 already in use?**
```bash
lsof -ti:3000 | xargs kill -9
# or
PORT=3001 npm run dev
```

**Database corrupted?**
```bash
rm database.sqlite
npm run init-db
```

**Node modules issues?**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. **Read README.md** — Full documentation
2. **Read ARCHITECTURE.md** — System design
3. **Read PROJECT_SUMMARY.md** — Training guide
4. **Run tests** — Follow verification steps above
5. **Explore logs** — `cat logs/app.log | jq .`
6. **Break the system** — `npm run break-user`
7. **Analyze failures** — Use logs to find issues
8. **Build tests** — Write your own scenarios

---

**Happy Testing! 🎯**
