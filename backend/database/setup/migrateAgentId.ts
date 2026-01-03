import "dotenv/config";
import mysql from "mysql2/promise";

/**
 * Migration: Change agent_id from BIGINT to VARCHAR(36) in code_evaluations and evaluation_runs tables
 * This allows storing UUID strings instead of numeric IDs
 */
async function migrateAgentId() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_DEFAULT_DATABASE || "code_reviewer",
    multipleStatements: true,
  });

  console.log("✅ Connected to MySQL");

  try {
    // Check current column types
    const [codeEvalColumns]: any = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'code_evaluations' 
      AND COLUMN_NAME = 'agent_id'
    `, [process.env.DB_DEFAULT_DATABASE || "code_reviewer"]);

    const [evalRunColumns]: any = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'evaluation_runs' 
      AND COLUMN_NAME = 'agent_id'
    `, [process.env.DB_DEFAULT_DATABASE || "code_reviewer"]);

    // Check if migration is needed
    const codeEvalNeedsMigration = codeEvalColumns.length > 0 && 
      (codeEvalColumns[0].DATA_TYPE === 'bigint' || codeEvalColumns[0].DATA_TYPE === 'int');
    
    const evalRunNeedsMigration = evalRunColumns.length > 0 && 
      (evalRunColumns[0].DATA_TYPE === 'bigint' || evalRunColumns[0].DATA_TYPE === 'int');

    if (!codeEvalNeedsMigration && !evalRunNeedsMigration) {
      console.log("✅ Migration not needed - columns are already VARCHAR(36)");
      return;
    }

    console.log("🔄 Starting migration...");

    // Check for existing data
    const [codeEvalCount]: any = await connection.query(
      "SELECT COUNT(*) as count FROM code_evaluations"
    );
    const [evalRunCount]: any = await connection.query(
      "SELECT COUNT(*) as count FROM evaluation_runs"
    );

    const hasCodeEvalData = codeEvalCount[0].count > 0;
    const hasEvalRunData = evalRunCount[0].count > 0;

    if (hasCodeEvalData || hasEvalRunData) {
      console.log("⚠️  WARNING: Existing data found in tables:");
      console.log(`   - code_evaluations: ${codeEvalCount[0].count} rows`);
      console.log(`   - evaluation_runs: ${evalRunCount[0].count} rows`);
      console.log("   These rows will be deleted as BIGINT values cannot be converted to UUIDs.");
      console.log("   If you need to preserve this data, please back it up first.");
    }

    // Drop foreign key constraints if they exist (they shouldn't, but just in case)
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    } catch (err) {
      // Ignore if not supported
    }

    // Delete existing data (since BIGINT values can't be converted to UUIDs)
    if (hasCodeEvalData) {
      await connection.query("DELETE FROM code_evaluations");
      console.log("   ✅ Cleared code_evaluations table");
    }

    if (hasEvalRunData) {
      await connection.query("DELETE FROM evaluation_runs");
      console.log("   ✅ Cleared evaluation_runs table");
    }

    // Alter columns
    if (codeEvalNeedsMigration) {
      await connection.query(`
        ALTER TABLE code_evaluations 
        MODIFY COLUMN agent_id VARCHAR(36) NOT NULL
      `);
      console.log("✅ Updated code_evaluations.agent_id to VARCHAR(36)");
    }

    if (evalRunNeedsMigration) {
      await connection.query(`
        ALTER TABLE evaluation_runs 
        MODIFY COLUMN agent_id VARCHAR(36) NOT NULL
      `);
      console.log("✅ Updated evaluation_runs.agent_id to VARCHAR(36)");
    }

    // Re-enable foreign key checks
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (err) {
      // Ignore if not supported
    }

    console.log("🎉 Migration completed successfully!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await connection.end();
    console.log("🔌 MySQL connection closed");
  }
}

migrateAgentId();

