import "dotenv/config";
import mysql from "mysql2/promise";

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  console.log("✅ Connected to MySQL");

  const sql = `
  /* -----------------------------
     Database
     ----------------------------- */
  CREATE DATABASE IF NOT EXISTS code_reviewer
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

  USE code_reviewer;

  /* -----------------------------
     Repositories
     ----------------------------- */
  CREATE TABLE repositories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    github_repo_id BIGINT NOT NULL UNIQUE,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  /* -----------------------------
     Pull Requests
     ----------------------------- */
  CREATE TABLE pull_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    github_repo_id BIGINT NOT NULL,
    pr_number INT NOT NULL,
    title VARCHAR(512),
    author VARCHAR(255),
    head_sha VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_repo_pr (github_repo_id, pr_number)
  );

  /* -----------------------------
     Code Evaluations
     ----------------------------- */
  CREATE TABLE code_evaluations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    github_repo_id BIGINT NOT NULL,
    pr_number INT NOT NULL,
    agent_id BIGINT NOT NULL,

    correctness_score TINYINT NOT NULL,
    security_score TINYINT NOT NULL,
    maintainability_score TINYINT NOT NULL,
    clarity_score TINYINT NOT NULL,
    production_readiness_score TINYINT NOT NULL,

    correctness_reason TEXT,
    security_reason TEXT,
    maintainability_reason TEXT,
    clarity_reason TEXT,
    production_readiness_reason TEXT,

    overall_summary TEXT,
    evaluation_model VARCHAR(100),
    evaluation_version VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_eval_repo_pr (github_repo_id, pr_number),
    INDEX idx_eval_agent (agent_id),
    INDEX idx_eval_created (created_at)
  );

  /* -----------------------------
     Evaluation Runs (Idempotency)
     ----------------------------- */
  CREATE TABLE evaluation_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    github_repo_id BIGINT NOT NULL,
    pr_number INT NOT NULL,
    agent_id BIGINT NOT NULL,
    head_sha VARCHAR(64) NOT NULL,

    status ENUM('success', 'failed') NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_eval_run (
      github_repo_id,
      pr_number,
      agent_id,
      head_sha
    )
  );
  `;

  try {
    await connection.query(sql);
    console.log("🎉 Database setup completed successfully");
  } catch (err) {
    console.error("❌ Database setup failed:", err);
    process.exit(1);
  } finally {
    await connection.end();
    console.log("🔌 MySQL connection closed");
  }
}

setupDatabase();
