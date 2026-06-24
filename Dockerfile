# Build dependencies stage
FROM node:20-alpine AS deps

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Build stage
FROM deps AS builder

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Test runner stage
FROM deps AS test-runner

COPY src ./src
COPY tests ./tests
COPY playwright.config.ts ./

CMD ["npm", "run", "test:ci"]

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/server.js"]
