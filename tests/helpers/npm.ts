import { execFileSync } from 'node:child_process';
import path from 'node:path';

function runTypeScriptScript(scriptPath: string, args: string[] = []): string {
  try {
    return execFileSync(
      process.execPath,
      ['-r', 'ts-node/register', scriptPath, ...args],
      {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run script ${scriptPath}: ${message}`);
  }
}

function runScriptInDocker(compiledScriptPath: string, args: string[] = []): string {
  try {
    // Run the compiled JS script inside the Docker container so writes go through
    // the container's own SQLite connection, avoiding Docker volume mount sync lag.
    return execFileSync(
      'docker',
      ['exec', 'auth-service', 'node', compiledScriptPath, ...args],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run script ${compiledScriptPath} in Docker: ${message}`);
  }
}

export function breakUser(email: string): void {
  runScriptInDocker('/app/dist/break_user.js', [email]);
}

export function restoreUser(email: string): void {
  runScriptInDocker('/app/dist/restore_user.js', [email]);
}