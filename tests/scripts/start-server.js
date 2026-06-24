const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cwd = process.cwd();
const defaultPort = process.env.PORT || '3100';

function runTypeScriptScript(scriptPath, args = []) {
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', scriptPath, ...args],
    {
    cwd,
    stdio: 'inherit',
    env: process.env,
    }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runTypeScriptScript(path.join('src', 'init_db.ts'));
runTypeScriptScript(path.join('src', 'restore_user.ts'), ['test@test.com']);

process.env.PORT = defaultPort;

require('ts-node/register');
require(path.join(cwd, 'src', 'server.ts'));