#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Starting MCP Docker log-analysis tests...\n');
console.log('ℹ️  Each test includes 3-second flush delays for pino logger.\n');

try {
  const result = execSync(
    'npx playwright test -c playwright.logs.config.ts tests/specs/logs-mcp.spec.ts --reporter=list',
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  );
  console.log('\n✅ All tests completed successfully!');
} catch (error) {
  console.log('\n❌ Tests completed with errors. Check test-results/ for details.');
  process.exit(1);
}
