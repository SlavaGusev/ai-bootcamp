import { db, dbRun } from './database';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';

// Hash password using simple SHA256 (for educational purposes only)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Create users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Users table created');

    // Check if test user already exists
    const existingUser = await new Promise<any>((resolve) => {
      db.get('SELECT * FROM users WHERE email = ?', ['test@test.com'], (err, row) => {
        resolve(row);
      });
    });

    if (!existingUser) {
      // Insert test user with password 'password123'
      const passwordHash = hashPassword('password123');
      await dbRun(
        `INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)`,
        ['test@test.com', passwordHash, 'active']
      );
      console.log('✅ Test user created: test@test.com (password: password123)');
    } else {
      console.log('⚠️  Test user already exists');
    }

    // Insert additional test users for various scenarios
    const additionalUsers = [
      { email: 'blocked@test.com', password: 'password123', status: 'blocked' },
      { email: 'admin@test.com', password: 'adminpass', status: 'active' },
    ];

    for (const user of additionalUsers) {
      const exists = await new Promise<any>((resolve) => {
        db.get('SELECT * FROM users WHERE email = ?', [user.email], (err, row) => {
          resolve(row);
        });
      });

      if (!exists) {
        const passwordHash = hashPassword(user.password);
        await dbRun(
          `INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)`,
          [user.email, passwordHash, user.status]
        );
        console.log(`✅ User created: ${user.email} (status: ${user.status})`);
      }
    }

    console.log('\n📊 Database initialization complete!');
    console.log('\nAvailable test accounts:');
    console.log('  • test@test.com (password: password123) - Status: active');
    console.log('  • blocked@test.com (password: password123) - Status: blocked');
    console.log('  • admin@test.com (password: adminpass) - Status: active');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
