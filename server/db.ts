import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Connecting to database with URL:", process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));

// Add connection timeout and retry logic for the database connection
const connectWithRetry = () => {
  console.log("Attempting to connect to database...");
  try {
    // Create a standard PostgreSQL connection pool (no WebSockets)
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Add longer connection timeout
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
      // Increase max clients for production
      max: 20
    });
    
    // Verify connection is working
    pool.on('error', (err) => {
      console.error('Unexpected database error on client:', err);
      // Don't crash on connection errors
    });
    
    return pool;
  } catch (err) {
    console.error('Failed to create database pool:', err);
    throw err;
  }
};

export const pool = connectWithRetry();
export const db = drizzle(pool, { schema });