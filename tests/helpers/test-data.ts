import crypto from 'crypto';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { db, dbRun } from '../../src/database';

export type SeedUserInput = {
  email: string;
  password: string;
  status?: 'active' | 'blocked';
};

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function seedUser(input: SeedUserInput): Promise<void> {
  const passwordHash = hashPassword(input.password);
  const status = input.status || 'active';

  // Seed the user inside the Docker container to avoid Docker volume mount
  // SQLite sync lag on Windows (Docker Desktop VirtioFS page cache issue).
  const inlineScript = `
    const s = require('sqlite3');
    const db = new s.Database('/app/database.sqlite');
    db.run(
      "INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, status = excluded.status, updated_at = CURRENT_TIMESTAMP",
      [${JSON.stringify(input.email)}, ${JSON.stringify(passwordHash)}, ${JSON.stringify(status)}],
      (err) => { if (err) { console.error(err); process.exit(1); } else { db.close(); } }
    );
  `;

  execFileSync('docker', ['exec', 'auth-service', 'node', '-e', inlineScript], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

export function createUniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@test.local`;
}

export function initializeDatabase(): void {
  execFileSync(process.execPath, ['-r', 'ts-node/register', path.join('src', 'init_db.ts')], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

export async function truncateApplicationLog(): Promise<void> {
  const logPath = path.join(process.cwd(), 'logs', 'app.log');
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, '');
}

export async function closeDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}