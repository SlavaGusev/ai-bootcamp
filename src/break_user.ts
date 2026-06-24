import { db, dbRun } from './database';

/**
 * This script "breaks" a user by changing their status to 'blocked'.
 * Use this to simulate a failed login scenario for testing purposes.
 */

async function blockUser() {
  try {
    const email = process.argv[2] || 'test@test.com';

    console.log(`🔒 Attempting to block user: ${email}`);

    // Update user status to blocked
    await dbRun(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      ['blocked', email]
    );

    // Verify the change
    const user = await new Promise<any>((resolve) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        resolve(row);
      });
    });

    if (user) {
      console.log(`✅ User ${email} has been blocked!`);
      console.log(`   Previous status: active`);
      console.log(`   Current status: ${user.status}`);
      console.log(`   Login attempts with this user will now return 403 Forbidden`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error blocking user:', error);
    process.exit(1);
  }
}

blockUser();
