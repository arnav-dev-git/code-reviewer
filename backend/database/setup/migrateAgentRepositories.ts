import "dotenv/config";
import mysql, { RowDataPacket } from "mysql2/promise";

async function migrateAgentRepositories() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_DEFAULT_DATABASE || "code_reviewer",
      multipleStatements: true,
    });

    console.log("✅ Connected to MySQL for agent-repositories migration");

    // Check if table exists
    const [tables] = await connection.query<RowDataPacket[]>(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_repositories'
    `);

    if (tables.length === 0) {
      // Create the table
      await connection.query(`
        CREATE TABLE agent_repositories (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          agent_id VARCHAR(36) NOT NULL,
          repository_full_name VARCHAR(512) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          UNIQUE KEY uniq_agent_repo (agent_id, repository_full_name),
          INDEX idx_agent_repo_agent (agent_id),
          INDEX idx_agent_repo_repo (repository_full_name)
        )
      `);
      console.log("✅ Created agent_repositories table");
    } else {
      console.log("✅ agent_repositories table already exists");
    }

    // Migrate existing repository settings from agents.settings to agent_repositories table
    const [agents] = await connection.query<RowDataPacket[]>(`
      SELECT id, settings FROM agents
    `);

    let migratedCount = 0;
    for (const agent of agents) {
      const settings = typeof agent.settings === "string" 
        ? JSON.parse(agent.settings) 
        : agent.settings;
      
      const repositories = Array.isArray(settings?.repositories) ? settings.repositories : [];
      
      if (repositories.length > 0) {
        // Insert repositories into mapping table
        for (const repo of repositories) {
          if (repo && typeof repo === "string" && repo.trim() !== "") {
            try {
              await connection.query(
                `INSERT IGNORE INTO agent_repositories (agent_id, repository_full_name) VALUES (?, ?)`,
                [agent.id, repo.trim()]
              );
            } catch (err: any) {
              if (err.code !== 'ER_DUP_ENTRY') {
                console.warn(`⚠️  Could not migrate repo "${repo}" for agent "${agent.id}":`, err.message);
              }
            }
          }
        }
        migratedCount++;
      }
    }

    console.log(`✅ Migrated repositories from ${migratedCount} agent(s) to agent_repositories table`);
    console.log("🎉 Agent-repositories migration completed successfully!");

  } catch (err: any) {
    console.error("❌ Agent-repositories migration failed:", err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 MySQL connection closed for migration");
    }
  }
}

migrateAgentRepositories();

