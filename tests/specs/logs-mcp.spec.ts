import { expect, test } from '@playwright/test';
import { breakUser, restoreUser } from '../helpers/npm';
import { ensureDockerAppReady, stopDockerApp } from '../helpers/docker';
import {
  getDockerAppStatus,
  listApplicationLogs,
  searchApplicationLogs,
  waitForLogEntries
} from '../helpers/logs-mcp';
import {
  closeDatabase,
  createUniqueEmail,
  initializeDatabase,
  seedUser,
  truncateApplicationLog
} from '../helpers/test-data';

type LoginResponse = {
  status: number;
  body: unknown;
};

const testPassword = 'password123';
let dockerBaseUrl = 'http://127.0.0.1:3000';
let startedByTest = false;
let dockerReady = false;
let dockerUnavailableReason = 'Docker daemon is not available';

async function loginAgainstDocker(payload: Record<string, unknown>): Promise<LoginResponse> {
  const response = await fetch(`${dockerBaseUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

test.describe('Docker log analysis via MCP', () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeAll(async () => {
    initializeDatabase();

    const dockerApp = await ensureDockerAppReady();
    if (!dockerApp.available) {
      dockerReady = false;
      dockerUnavailableReason = dockerApp.message || dockerUnavailableReason;
      return;
    }

    dockerBaseUrl = dockerApp.baseUrl;
    startedByTest = dockerApp.startedByTest;
    dockerReady = true;

    await truncateApplicationLog();

    const dockerStatus = await getDockerAppStatus();
    expect(dockerStatus).toContain('Container: auth-service');
    expect(dockerStatus).toContain('Host logs directory:');

    const availableLogs = await listApplicationLogs();
    expect(availableLogs).toContain('app.log');
  });

  test.afterAll(async () => {
    await closeDatabase();

    if (startedByTest) {
      stopDockerApp();
    }
  });

  test('Goal: Train AI agent to parse blocked-user failures from Docker logs', async () => {
    test.skip(!dockerReady, dockerUnavailableReason);

    const email = createUniqueEmail('blocked-user');
    await seedUser({ email, password: testPassword, status: 'active' });
    breakUser(email);

    try {
      const response = await loginAgainstDocker({ email, password: testPassword });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'User account is blocked' });

      // Give the logger time to flush entries to disk
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const matchingEntries = await waitForLogEntries((entries) =>
        entries.filter((entry) => entry.email === email && entry.reason === 'user_blocked')
      );
      const blockedEntry = matchingEntries.at(-1);

      const logSummary = await searchApplicationLogs(email, 'app.log', 20);
      expect(logSummary).toContain(email);

      expect(blockedEntry?.event).toBe('login_attempt');
      expect(blockedEntry?.status).toBe('blocked');
    } finally {
      restoreUser(email);
    }
  });

  test('Approach: Trigger invalid-password and missing-credentials failures and match log patterns', async () => {
    test.skip(!dockerReady, dockerUnavailableReason);

    const email = createUniqueEmail('pattern-check');
    await seedUser({ email, password: testPassword, status: 'active' });

    const invalidPasswordResponse = await loginAgainstDocker({ email, password: 'definitely-wrong' });
    // A second wrong-password attempt ensures invalid_password is logged even if Docker DB cache
    // caused the first attempt to return user_not_found due to SQLite file-share sync lag
    await loginAgainstDocker({ email, password: 'also-wrong' });
    // Send empty string so the request body contains password: '' (triggers missing_credentials)
    const missingCredentialsResponse = await loginAgainstDocker({ email, password: '' });

    expect(invalidPasswordResponse.status).toBe(401);
    expect(missingCredentialsResponse.status).toBe(400);

    // Give the logger time to flush entries to disk
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Combine both searches into one call to avoid spawning two separate MCP processes
    const allEntries = await waitForLogEntries((entries) => {
      const emailEntries = entries.filter((entry) => entry.email === email);
      const invalidPasswordEntries = emailEntries.filter((entry) => entry.reason === 'invalid_password');
      const missingCredentialsEntries = emailEntries.filter((entry) => entry.reason === 'missing_credentials');
      
      // Return all entries if we found at least one of each type
      return (invalidPasswordEntries.length > 0 && missingCredentialsEntries.length > 0) 
        ? emailEntries 
        : [];
    });

    const invalidPasswordEntries = allEntries.filter((entry) => entry.reason === 'invalid_password');
    const missingCredentialsEntries = allEntries.filter((entry) => entry.reason === 'missing_credentials');
    const logSummary = await searchApplicationLogs(email, 'app.log', 50);

    expect(logSummary).toContain('invalid_password');

    expect(invalidPasswordEntries.at(-1)?.event).toBe('login_attempt');
    expect(missingCredentialsEntries.at(-1)?.event).toBe('login_attempt');
  });

  test('Skills: Detect repeated invalid-password anomalies from MCP log data', async () => {
    test.setTimeout(180_000); // 3 minutes - MCP spawn + polling for 4+ entries
    test.skip(!dockerReady, dockerUnavailableReason);

    const email = createUniqueEmail('anomaly');
    await seedUser({ email, password: testPassword, status: 'active' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAgainstDocker({ email, password: `wrong-${attempt}` });
      expect(response.status).toBe(401);
    }

    // Give the logger time to flush entries to disk
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const anomalyEntries = await waitForLogEntries((entries) =>
      entries.filter((entry) => entry.email === email && entry.reason === 'invalid_password')
    );

    expect(anomalyEntries.length).toBeGreaterThanOrEqual(4);
    expect(anomalyEntries.every((entry) => entry.event === 'login_attempt')).toBe(true);

    const logSummary = await searchApplicationLogs(email, 'app.log', 50);
    const summarizedFailures = logSummary
      .split(/\r?\n/)
      .filter((line) => line.includes('invalid_password'));

    expect(summarizedFailures.length).toBeGreaterThanOrEqual(4);
  });
});