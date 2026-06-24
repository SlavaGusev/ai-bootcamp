import { execFileSync } from 'node:child_process';

const composeArgs = ['compose'];
const serviceName = 'auth-service';
const dockerBaseUrl = 'http://127.0.0.1:3000';

type DockerCommandResult = {
  ok: boolean;
  output: string;
  error?: string;
};

function runDockerCommand(args: string[], allowFailure = false): DockerCommandResult {
  try {
    const output = execFileSync('docker', [...composeArgs, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    return { ok: true, output };
  } catch (error) {
    if (allowFailure) {
      return {
        ok: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Docker command failed: docker ${[...composeArgs, ...args].join(' ')}\n${message}`);
  }
}

async function waitForHealth(url: string, attempts = 30): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the container is reachable.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Dockerized application did not become healthy at ${url}/health`);
}

export async function ensureDockerAppReady(): Promise<{
  available: boolean;
  startedByTest: boolean;
  baseUrl: string;
  message?: string;
}> {
  const runningServicesResult = runDockerCommand(['ps', '--status', 'running', '--services'], true);

  if (!runningServicesResult.ok) {
    return {
      available: false,
      startedByTest: false,
      baseUrl: dockerBaseUrl,
      message: runningServicesResult.error || 'Docker is unavailable'
    };
  }

  const runningServices = runningServicesResult.output
    .split(/\r?\n/)
    .map((service) => service.trim())
    .filter(Boolean);
  const startedByTest = !runningServices.includes(serviceName);

  runDockerCommand(['up', '--build', '-d', serviceName]);
  await waitForHealth(dockerBaseUrl);

  return {
    available: true,
    startedByTest,
    baseUrl: dockerBaseUrl
  };
}

export function stopDockerApp(): void {
  runDockerCommand(['stop', serviceName], true);
}