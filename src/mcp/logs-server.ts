import { execFile as execFileCallback } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const execFile = promisify(execFileCallback);
const workspaceRoot = process.cwd();
const logsDir = path.resolve(workspaceRoot, process.env.LOGS_DIR || 'logs');
const containerName = process.env.DOCKER_CONTAINER_NAME || 'auth-service';
const containerLogsDir = process.env.CONTAINER_LOGS_DIR || '/app/logs';
const defaultTailLines = 100;
const maxTailLines = 500;
const maxSearchMatches = 200;

const server = new McpServer({
  name: 'auth-service-logs',
  version: '1.0.0'
});

function isPathInsideLogsDir(candidatePath: string): boolean {
  const relative = path.relative(logsDir, candidatePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveLogFile(fileName: string): string {
  const trimmedName = fileName.trim();
  if (!trimmedName) {
    throw new Error('fileName must not be empty');
  }

  const resolvedPath = path.resolve(logsDir, trimmedName);
  if (!isPathInsideLogsDir(resolvedPath)) {
    throw new Error('fileName must stay inside the logs directory');
  }

  return resolvedPath;
}

function formatTextResult(text: string, structuredContent?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent
  };
}

async function runDockerCommand(args: string[]) {
  try {
    const result = await execFile('docker', args, {
      cwd: workspaceRoot,
      windowsHide: true
    });

    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      stdout: '',
      stderr: message
    };
  }
}

async function listLogFiles() {
  const entries = await fs.readdir(logsDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fullPath = path.join(logsDir, entry.name);
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString()
        };
      })
  );

  return files.sort((left, right) => left.name.localeCompare(right.name));
}

async function tailLogFile(filePath: string, lines: number) {
  const rawContent = await fs.readFile(filePath, 'utf8');
  const contentLines = rawContent.split(/\r?\n/);
  const requestedLines = Math.min(Math.max(lines, 1), maxTailLines);
  return contentLines.slice(-requestedLines).join('\n').trim();
}

server.registerTool(
  'docker_app_status',
  {
    description: 'Check whether the Docker container for the auth service is running and how its logs directory is mounted.',
    inputSchema: {}
  },
  async () => {
    const [inspectResult, healthResult] = await Promise.all([
      runDockerCommand([
        'inspect',
        containerName,
        '--format',
        '{{json .State}}'
      ]),
      runDockerCommand([
        'inspect',
        containerName,
        '--format',
        '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
      ])
    ]);

    if (!inspectResult.ok) {
      return formatTextResult(
        `Unable to inspect Docker container \"${containerName}\". ${inspectResult.stderr}`,
        {
          containerName,
          logsDir,
          containerLogsDir,
          dockerAvailable: false
        }
      );
    }

    return formatTextResult(
      [
        `Container: ${containerName}`,
        `State: ${inspectResult.stdout || 'unknown'}`,
        `Host logs directory: ${logsDir}`,
        `Container logs directory: ${containerLogsDir}`,
        `Mounts:\n${healthResult.stdout || 'No mounts reported'}`
      ].join('\n'),
      {
        containerName,
        state: inspectResult.stdout,
        mounts: healthResult.stdout,
        logsDir,
        containerLogsDir,
        dockerAvailable: true
      }
    );
  }
);

server.registerTool(
  'list_application_logs',
  {
    description: 'List log files available from the logs directory mounted from the Docker container.',
    inputSchema: {}
  },
  async () => {
    const files = await listLogFiles();
    if (files.length === 0) {
      return formatTextResult(`No log files were found in ${logsDir}.`, {
        logsDir,
        files
      });
    }

    const lines = files.map((file) => `${file.name} | ${file.sizeBytes} bytes | updated ${file.modifiedAt}`);
    return formatTextResult(lines.join('\n'), { logsDir, files });
  }
);

server.registerTool(
  'read_application_log',
  {
    description: 'Read the tail of a log file from the logs directory shared with the Dockerized application.',
    inputSchema: {
      fileName: z.string().describe('Log file name relative to the logs directory, for example app.log'),
      lines: z.number().int().min(1).max(maxTailLines).optional().describe('Number of trailing lines to return. Defaults to 100.')
    }
  },
  async ({ fileName, lines }) => {
    const filePath = resolveLogFile(fileName);
    const output = await tailLogFile(filePath, lines ?? defaultTailLines);
    return formatTextResult(output || '(log file is empty)', {
      logsDir,
      fileName,
      requestedLines: lines ?? defaultTailLines
    });
  }
);

server.registerTool(
  'search_application_logs',
  {
    description: 'Search one log file or all log files in the mounted logs directory for matching text.',
    inputSchema: {
      query: z.string().min(1).describe('Case-insensitive text to search for inside application logs.'),
      fileName: z.string().optional().describe('Optional single log file name to narrow the search.'),
      limit: z.number().int().min(1).max(maxSearchMatches).optional().describe('Maximum number of matching lines to return. Defaults to 50.')
    }
  },
  async ({ query, fileName, limit }) => {
    const normalizedQuery = query.toLowerCase();
    const filesToSearch = fileName
      ? [fileName]
      : (await listLogFiles()).map((file) => file.name);
    const maxResults = Math.min(limit ?? 50, maxSearchMatches);
    const matches: Array<{ fileName: string; lineNumber: number; text: string }> = [];

    for (const candidate of filesToSearch) {
      const filePath = resolveLogFile(candidate);
      const rawContent = await fs.readFile(filePath, 'utf8');
      const contentLines = rawContent.split(/\r?\n/);

      for (const [index, line] of contentLines.entries()) {
        if (line.toLowerCase().includes(normalizedQuery)) {
          matches.push({ fileName: candidate, lineNumber: index + 1, text: line });
        }

        if (matches.length >= maxResults) {
          break;
        }
      }

      if (matches.length >= maxResults) {
        break;
      }
    }

    if (matches.length === 0) {
      return formatTextResult(`No matches found for \"${query}\".`, {
        logsDir,
        query,
        matches
      });
    }

    const summary = matches.map((match) => `${match.fileName}:${match.lineNumber} ${match.text}`);
    return formatTextResult(summary.join('\n'), {
      logsDir,
      query,
      matches
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});