import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function migrateAddRepositoryId() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "code_reviewer",
  });

  try {
    console.log("🔄 Starting migration: Add repository_id to agent_repositories...");

    // Check if column already exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'agent_repositories' 
       AND COLUMN_NAME = 'repository_id'`,
      [process.env.DB_NAME || "code_reviewer"]
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✅ Column repository_id already exists, skipping migration");
      return;
    }

    // Add repository_id column
    await connection.query(`
      ALTER TABLE agent_repositories
      ADD COLUMN repository_id BIGINT NULL AFTER agent_id
    `);
    console.log("✅ Added repository_id column");

    // Populate repository_id from repositories table
    await connection.query(`
      UPDATE agent_repositories ar
      INNER JOIN repositories r ON ar.repository_full_name = r.full_name
      SET ar.repository_id = r.id
    `);
    console.log("✅ Populated repository_id from repositories table");

    // Make repository_id NOT NULL
    await connection.query(`
      ALTER TABLE agent_repositories
      MODIFY COLUMN repository_id BIGINT NOT NULL
    `);
    console.log("✅ Made repository_id NOT NULL");

    // Add foreign key constraint
    await connection.query(`
      ALTER TABLE agent_repositories
      ADD CONSTRAINT fk_agent_repo_repository
      FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
    `);
    console.log("✅ Added foreign key constraint");

    // Add unique constraint on (agent_id, repository_id)
    await connection.query(`
      ALTER TABLE agent_repositories
      ADD UNIQUE KEY uniq_agent_repo (agent_id, repository_id)
    `);
    console.log("✅ Added unique constraint on (agent_id, repository_id)");

    // Add index on repository_id
    await connection.query(`
      ALTER TABLE agent_repositories
      ADD INDEX idx_agent_repo_repo_id (repository_id)
    `);
    console.log("✅ Added index on repository_id");

    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    await connection.end();
    console.log("🔌 MySQL connection closed");
  }
}

migrateAddRepositoryId().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

