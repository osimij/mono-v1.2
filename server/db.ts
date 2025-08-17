import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket connections with more compatible settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with more conservative settings for Node.js 18
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Very conservative pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Longer timeout
  ssl: {
    rejectUnauthorized: false
  }
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
  // Don't exit the process, just log the error
});

export const db = drizzle({ client: pool, schema });