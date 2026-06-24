import { db, dbRun } from './database';

/**
 * This script restores a user by changing their status back to 'active'.
 * Use this to recover from a "broken" state.
 */

async function restoreUser() {
  try {
    const email = process.argv[2] || 'test@test.com';

    console.log(`✨ Attempting to restore user: ${email}`);

    // Update user status to active
    await dbRun(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      ['active', email]
    );

    // Verify the change
    const user = await new Promise<any>((resolve) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        resolve(row);
      });
    });

    if (user) {
      console.log(`✅ User ${email} has been restored!`);
      console.log(`   Current status: ${user.status}`);
      console.log(`   Login should now work correctly`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error restoring user:', error);
    process.exit(1);
  }
}

restoreUser();
