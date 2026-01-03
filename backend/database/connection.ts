import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_DEFAULT_DATABASE || "code_reviewer",
  multipleStatements: true,
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000, // 10 seconds
  timeout: 10000, // 10 seconds
};

// Create a singleton pool instance
let poolInstance: Pool | null = null;

function connectDB(): Pool {
  // Return existing pool if it exists
  if (poolInstance) {
    return poolInstance;
  }

  // Create new pool only once
  poolInstance = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10, // Maximum 10 connections in the pool
    queueLimit: 0, // Unlimited queue
  });

  // Test connection on pool creation (only once)
  poolInstance.getConnection()
    .then((connection) => {
      console.log("✅ Database connection pool created successfully");
      connection.release();
    })
    .catch((err) => {
      console.error("❌ Database connection failed:", err.message);
      console.error("Please check your database configuration:");
      console.error(`  Host: ${dbConfig.host}`);
      console.error(`  Port: ${dbConfig.port}`);
      console.error(`  User: ${dbConfig.user}`);
      console.error(`  Database: ${dbConfig.database}`);
      console.error("\nMake sure:");
      console.error("  1. MySQL server is running");
      console.error("  2. Database 'code_reviewer' exists (run: npm run setup-db)");
      console.error("  3. Environment variables are set correctly in .env file");
    });

  return poolInstance;
}

export default connectDB;
