import express, { Request, Response } from 'express';
import { dbGet } from './database';
import logger from './logger';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
});

// Hash password function (same as in init_db.ts for consistency)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  logger.info('Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    logger.warn({
      event: 'login_attempt',
      email: email || 'missing',
      reason: 'missing_credentials',
    });
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Query user from database
    const user = await dbGet(
      'SELECT id, email, password_hash, status FROM users WHERE email = ?',
      [email]
    );

    // User not found
    if (!user) {
      logger.warn({
        event: 'login_attempt',
        email,
        reason: 'user_not_found',
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      logger.warn({
        event: 'login_attempt',
        email,
        reason: 'invalid_password',
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check user status
    if (user.status === 'blocked') {
      logger.warn({
        event: 'login_attempt',
        email,
        reason: 'user_blocked',
        status: user.status,
      });
      return res.status(403).json({ error: 'User account is blocked' });
    }

    if (user.status !== 'active') {
      logger.warn({
        event: 'login_attempt',
        email,
        reason: 'invalid_user_status',
        status: user.status,
      });
      return res.status(403).json({ error: 'User account is not active' });
    }

    // Successful login
    logger.info({
      event: 'login_success',
      email,
      user_id: user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, email: user.email, status: user.status },
    });
  } catch (error) {
    logger.error({
      event: 'login_error',
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn({
    event: '404_not_found',
    method: req.method,
    path: req.path,
  });
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info({
    event: 'server_started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log(`\n🚀 AuthService is running on http://localhost:${PORT}`);
  console.log(`📝 Logs are written to logs/app.log\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app;
