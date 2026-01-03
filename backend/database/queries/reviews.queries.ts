import connectDB from "../connection.js";
import { RowDataPacket } from "mysql2/promise";

export interface EvaluationRow extends RowDataPacket {
  id: number;
  github_repo_id: number;
  pr_number: number;
  agent_id: string;
  agent_name: string;
  agent_description: string | null;
  repo_owner: string; 
  repo_name: string;
  pr_title: string | null;
  pr_author: string | null;
  correctness_score: number;
  security_score: number;
  maintainability_score: number;
  clarity_score: number;
  production_readiness_score: number;
  correctness_reason: string | null;
  security_reason: string | null;
  maintainability_reason: string | null;
  clarity_reason: string | null;
  production_readiness_reason: string | null;
  overall_summary: string | null;
  evaluation_model: string | null;
  evaluation_version: string | null;
  created_at: Date;
}

export interface Review {
  id: number;
  agentId: string;
  agentName: string;
  agentDescription: string | null;
  repository: string; // Format: "owner/repo"
  prNumber: number;
  prTitle: string | null;
  prAuthor: string | null;
  scores: {
    correctness: number;
    security: number;
    maintainability: number;
    clarity: number;
    productionReadiness: number;
  };
  reasons: {
    correctness: string | null;
    security: string | null;
    maintainability: string | null;
    clarity: string | null;
    productionReadiness: string | null;
  };
  overallSummary: string | null;
  evaluationModel: string | null;
  evaluationVersion: string | null;
  createdAt: string;
}

/**
 * Convert database row to Review object
 */
function rowToReview(row: EvaluationRow): Review {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    agentDescription: row.agent_description,
    repository: `${row.repo_owner}/${row.repo_name}`,
    prNumber: row.pr_number,
    prTitle: row.pr_title,
    prAuthor: row.pr_author,
    scores: {
      correctness: row.correctness_score,
      security: row.security_score,
      maintainability: row.maintainability_score,
      clarity: row.clarity_score,
      productionReadiness: row.production_readiness_score,
    },
    reasons: {
      correctness: row.correctness_reason,
      security: row.security_reason,
      maintainability: row.maintainability_reason,
      clarity: row.clarity_reason,
      productionReadiness: row.production_readiness_reason,
    },
    overallSummary: row.overall_summary,
    evaluationModel: row.evaluation_model,
    evaluationVersion: row.evaluation_version,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Get all reviews with optional filters
 */
export async function getReviews(filters?: {
  agentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<Review[]> {
  const pool = connectDB();
  
  let query = `
    SELECT 
      ce.id,
      ce.github_repo_id,
      ce.pr_number,
      ce.agent_id,
      a.name as agent_name,
      a.description as agent_description,
      r.owner as repo_owner,
      r.name as repo_name,
      pr.title as pr_title,
      pr.author as pr_author,
      ce.correctness_score,
      ce.security_score,
      ce.maintainability_score,
      ce.clarity_score,
      ce.production_readiness_score,
      ce.correctness_reason,
      ce.security_reason,
      ce.maintainability_reason,
      ce.clarity_reason,
      ce.production_readiness_reason,
      ce.overall_summary,
      ce.evaluation_model,
      ce.evaluation_version,
      ce.created_at
    FROM code_evaluations ce
    LEFT JOIN agents a ON ce.agent_id = a.id
    LEFT JOIN repositories r ON ce.github_repo_id = r.github_repo_id
    LEFT JOIN pull_requests pr ON ce.github_repo_id = pr.github_repo_id 
      AND ce.pr_number = pr.pr_number
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (filters?.agentId) {
    query += ` AND ce.agent_id = ?`;
    params.push(filters.agentId);
  }
  
  if (filters?.startDate) {
    query += ` AND DATE(ce.created_at) >= ?`;
    params.push(filters.startDate);
  }
  
  if (filters?.endDate) {
    query += ` AND DATE(ce.created_at) <= ?`;
    params.push(filters.endDate);
  }
  
  query += ` ORDER BY ce.created_at DESC`;
  
  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
    
    if (filters?.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }
  
  const [rows] = await pool.execute<EvaluationRow[]>(query, params);
  return rows.map(rowToReview);
}

/**
 * Get review statistics for overview
 */
export interface ReviewStats {
  totalReviews: number;
  averageScores: {
    correctness: number;
    security: number;
    maintainability: number;
    clarity: number;
    productionReadiness: number;
  };
  trendData: Array<{
    index: number; // Review index (1-50, newest to oldest)
    helpfulness: number; // Average of all scores
  }>;
  agentComparison: Array<{
    agentId: string;
    agentName: string;
    avgScore: number;
    reviewCount: number;
  }>;
}

export async function getReviewStats(filters?: {
  agentId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ReviewStats> {
  const pool = connectDB();
  
  let whereClause = `WHERE 1=1`;
  const params: any[] = [];
  
  if (filters?.agentId) {
    whereClause += ` AND ce.agent_id = ?`;
    params.push(filters.agentId);
  }
  
  if (filters?.startDate) {
    whereClause += ` AND DATE(ce.created_at) >= ?`;
    params.push(filters.startDate);
  }
  
  if (filters?.endDate) {
    whereClause += ` AND DATE(ce.created_at) <= ?`;
    params.push(filters.endDate);
  }
  
  // Get total reviews and average scores
  const [statsRows] = await pool.execute<RowDataPacket[]>(`
    SELECT 
      COUNT(*) as total_reviews,
      AVG(correctness_score) as avg_correctness,
      AVG(security_score) as avg_security,
      AVG(maintainability_score) as avg_maintainability,
      AVG(clarity_score) as avg_clarity,
      AVG(production_readiness_score) as avg_production_readiness
    FROM code_evaluations ce
    ${whereClause}
  `, params);
  
  const stats = statsRows[0];
  
  // Get trend data (last 50 reviews, ordered by creation date)
  const [trendRows] = await pool.execute<RowDataPacket[]>(`
    SELECT 
      id,
      (correctness_score + security_score + maintainability_score + 
       clarity_score + production_readiness_score) / 5 as helpfulness,
      created_at
    FROM code_evaluations ce
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 50
  `, params);
  
  // Get agent comparison
  const [agentRows] = await pool.execute<RowDataPacket[]>(`
    SELECT 
      ce.agent_id,
      a.name as agent_name,
      AVG(
        (ce.correctness_score + ce.security_score + ce.maintainability_score + 
         ce.clarity_score + ce.production_readiness_score) / 5
      ) as avg_score,
      COUNT(*) as review_count
    FROM code_evaluations ce
    LEFT JOIN agents a ON ce.agent_id = a.id
    ${whereClause}
    GROUP BY ce.agent_id, a.name
    ORDER BY avg_score DESC
  `, params);
  
  return {
    totalReviews: stats.total_reviews || 0,
    averageScores: {
      correctness: Number(stats.avg_correctness || 0),
      security: Number(stats.avg_security || 0),
      maintainability: Number(stats.avg_maintainability || 0),
      clarity: Number(stats.avg_clarity || 0),
      productionReadiness: Number(stats.avg_production_readiness || 0),
    },
    trendData: trendRows.reverse().map((row, index) => ({
      index: index + 1, // 1-50, oldest to newest (reversed from DESC order)
      helpfulness: Number(row.helpfulness || 0),
    })),
    agentComparison: agentRows.map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name || 'Unknown Agent',
      avgScore: Number(row.avg_score || 0),
      reviewCount: row.review_count || 0,
    })),
  };
}

