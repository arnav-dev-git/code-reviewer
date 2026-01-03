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
    fullName?: string; // Kept for API compatibility but not stored in DB
    description?: string;
    url?: string;
    htmlUrl?: string;
    isPrivate?: boolean;
    defaultBranch?: string;
    language?: string;
    starsCount?: number;
    forksCount?: number;
  }
): Promise<void> {
  const { 
    githubRepoId, 
    owner, 
    name,
  } = params;

  // First, try to check which columns exist
  try {
    // Try the full insert with all columns
    await conn.execute(
      `
      INSERT INTO repositories (
        github_repo_id, owner, name,
        description, url, html_url, is_private,
        default_branch, language, stars_count, forks_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        owner = VALUES(owner),
        name = VALUES(name),
        description = VALUES(description),
        url = VALUES(url),
        html_url = VALUES(html_url),
        is_private = VALUES(is_private),
        default_branch = VALUES(default_branch),
        language = VALUES(language),
        stars_count = VALUES(stars_count),
        forks_count = VALUES(forks_count),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        githubRepoId,
        owner,
        name,
        params.description || null,
        params.url || null,
        params.htmlUrl || null,
        params.isPrivate ?? false,
        params.defaultBranch || 'main',
        params.language || null,
        params.starsCount || 0,
        params.forksCount || 0,
      ]
    );
  } catch (err: any) {
    // If columns don't exist, fall back to basic columns only
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log("⚠️  Repository table missing new columns. Using basic columns only. Run 'npm run migrate-repositories' to add them.");
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
    } else {
      throw err;
    }
  }
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
    agentId: string;
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
    agentId: string;
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
