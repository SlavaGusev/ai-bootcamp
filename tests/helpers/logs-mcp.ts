import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type TextContentBlock = {
  type: 'text';
  text: string;
};

type ToolCallResponse = {
  content?: Array<TextContentBlock | Record<string, unknown>>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type ParsedLogEntry = {
  level?: number;
  time?: number;
  pid?: number;
  hostname?: string;
  msg?: string;
  method?: string;
  path?: string;
  timestamp?: string;
  event?: string;
  email?: string;
  reason?: string;
  status?: string;
  user_id?: number;
};

const workspaceRoot = process.cwd();

async function withLogsClient<T>(callback: (client: Client, transport: StdioClientTransport) => Promise<T>): Promise<T> {
  const client = new Client(
    { name: 'logs-mcp-test-client', version: '1.0.0' },
    { capabilities: {} }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['-r', 'ts-node/register', path.join('src', 'mcp', 'logs-server.ts')],
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DOCKER_CONTAINER_NAME: 'auth-service',
      LOGS_DIR: 'logs',
      CONTAINER_LOGS_DIR: '/app/logs'
    },
    stderr: 'pipe'
  });

  try {
    await client.connect(transport);
    return await callback(client, transport);
  } finally {
    await transport.close();
  }
}

function getTextFromResponse(response: ToolCallResponse): string {
  return (response.content || [])
    .filter((item): item is TextContentBlock => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
}

async function callTool(name: string, args?: Record<string, unknown>): Promise<ToolCallResponse> {
  return withLogsClient(async (client) => {
    const response = await client.callTool({ name, arguments: args || {} });
    return response as ToolCallResponse;
  });
}

export async function getDockerAppStatus(): Promise<string> {
  const response = await callTool('docker_app_status');
  return getTextFromResponse(response);
}

export async function listApplicationLogs(): Promise<string> {
  const response = await callTool('list_application_logs');
  return getTextFromResponse(response);
}

export async function readApplicationLog(fileName: string, lines = 200): Promise<string> {
  const response = await callTool('read_application_log', { fileName, lines });
  return getTextFromResponse(response);
}

export async function searchApplicationLogs(query: string, fileName?: string, limit = 50): Promise<string> {
  const response = await callTool('search_application_logs', { query, fileName, limit });
  return getTextFromResponse(response);
}

export function parseJsonLogLines(rawLog: string): ParsedLogEntry[] {
  return rawLog
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.endsWith('}'))
    .map((line) => JSON.parse(line) as ParsedLogEntry);
}

export async function waitForLogEntries(
  predicate: (entries: ParsedLogEntry[]) => ParsedLogEntry[],
  options: { fileName?: string; lines?: number; attempts?: number; delayMs?: number } = {}
): Promise<ParsedLogEntry[]> {
  const fileName = options.fileName || 'app.log';
  const lines = options.lines || 300;
  const attempts = options.attempts || 20;
  const delayMs = options.delayMs || 500;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rawLog = await readApplicationLog(fileName, lines);
    const parsedEntries = parseJsonLogLines(rawLog);
    const matchedEntries = predicate(parsedEntries);

    if (matchedEntries.length > 0) {
      return matchedEntries;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Expected matching log entries in ${fileName} but none were found`);
}