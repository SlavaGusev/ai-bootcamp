import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a logger that writes JSON logs to file
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        {
          level: 'debug',
          target: 'pino/file',
          options: { destination: path.join(logsDir, 'app.log') }
        }
      ]
    }
  }
);

export default logger;
