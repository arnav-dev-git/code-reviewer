import "dotenv/config";
import { Connection } from "mysql2/promise";

/**
 * -----------------------------------
 * Repository INSERT / UPSERT
 * -----------------------------------
 */
export async function insertOrUpdateRepository(
  conn: Connection,
  params: {
    githubRepoId: number;
    owner: string;
    name: string;
  }
): Promise<void> {
  const { githubRepoId, owner, name } = params;

  await conn.execute(
    `
    INSERT INTO repositories (github_repo_id, owner, name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      owner = VALUES(owner),
      name = VALUES(name)
    `,
    [githubRepoId, owner, name]
  );
}

/**
 * -----------------------------------
 * Pull Request INSERT / UPSERT
 * (NO repository_id, NO FK)
 * -----------------------------------
 */
export async function insertOrUpdatePullRequest(
  conn: Connection,
  params: {
    githubRepoId: number;
    prNumber: number;
    title: string;
    author: string;
    headSha: string;
  }
): Promise<void> {
  const {
    githubRepoId,
    prNumber,
    title,
    author,
    headSha,
  } = params;

  await conn.execute(
    `
    INSERT INTO pull_requests
      (github_repo_id, pr_number, title, author, head_sha)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      author = VALUES(author),
      head_sha = VALUES(head_sha),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      githubRepoId,
      prNumber,
      title,
      author,
      headSha,
    ]
  );
}

/**
 * -----------------------------------
 * Code Evaluation INSERT
 * (NO pull_request_id FK)
 * -----------------------------------
 */
export async function insertCodeEvaluation(
  conn: Connection,
  params: {
    githubRepoId: number;
    prNumber: number;
    agentId: number;
    scores: {
      correctness: number;
      security: number;
      maintainability: number;
      clarity: number;
      productionReadiness: number;
    };
    reasons: {
      correctness: string;
      security: string;
      maintainability: string;
      clarity: string;
      productionReadiness: string;
    };
    overallSummary: string;
    evaluationModel?: string;
    evaluationVersion?: string;
  }
): Promise<void> {
  const {
    githubRepoId,
    prNumber,
    agentId,
    scores,
    reasons,
    overallSummary,
    evaluationModel = "gpt-4.1",
    evaluationVersion = "v1",
  } = params;

  await conn.execute(
    `
    INSERT INTO code_evaluations (
      github_repo_id,
      pr_number,
      agent_id,
      correctness_score,
      security_score,
      maintainability_score,
      clarity_score,
      production_readiness_score,
      correctness_reason,
      security_reason,
      maintainability_reason,
      clarity_reason,
      production_readiness_reason,
      overall_summary,
      evaluation_model,
      evaluation_version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      githubRepoId,
      prNumber,
      agentId,
      scores.correctness,
      scores.security,
      scores.maintainability,
      scores.clarity,
      scores.productionReadiness,
      reasons.correctness,
      reasons.security,
      reasons.maintainability,
      reasons.clarity,
      reasons.productionReadiness,
      overallSummary,
      evaluationModel,
      evaluationVersion,
    ]
  );
}

/**
 * -----------------------------------
 * Evaluation Run INSERT
 * (Idempotency, NO FK)
 * -----------------------------------
 */
export async function insertEvaluationRun(
  conn: Connection,
  params: {
    githubRepoId: number;
    prNumber: number;
    agentId: number;
    headSha: string;
    status: "success" | "failed";
    errorMessage?: string | null;
  }
): Promise<void> {
  const {
    githubRepoId,
    prNumber,
    agentId,
    headSha,
    status,
    errorMessage = null,
  } = params;

  await conn.execute(
    `
    INSERT INTO evaluation_runs
      (github_repo_id, pr_number, agent_id, head_sha, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      githubRepoId,
      prNumber,
      agentId,
      headSha,
      status,
      errorMessage,
    ]
  );
}
