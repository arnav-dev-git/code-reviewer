import connectDB from "../connection.js";
import { RowDataPacket } from "mysql2/promise";
import * as agentReposQueries from "./agentRepositories.queries.js";

export interface RepositoryRow extends RowDataPacket {
  id: number;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  url: string | null;
  html_url: string | null;
  is_private: boolean;
  default_branch: string;
  language: string | null;
  stars_count: number;
  forks_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Repository {
  id: number;
  githubRepoId: number;
  fullName: string; // Format: "owner/name"
  owner: string;
  name: string;
  description: string | null;
  url: string | null;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  starsCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
  prCount?: number; // Optional: count of pull requests
  reviewCount?: number; // Optional: count of reviews
}

/**
 * Convert database row to Repository object
 */
function rowToRepository(row: any): Repository {
  return {
    id: row.id,
    githubRepoId: row.github_repo_id,
    fullName: row.full_name || `${row.owner}/${row.name}`,
    owner: row.owner,
    name: row.name,
    description: row.description ?? null,
    url: row.url ?? null,
    htmlUrl: row.html_url ?? null,
    isPrivate: Boolean(row.is_private ?? false),
    defaultBranch: row.default_branch || 'main',
    language: row.language ?? null,
    starsCount: row.stars_count ?? 0,
    forksCount: row.forks_count ?? 0,
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : new Date().toISOString(),
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : (row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : new Date().toISOString()),
  };
}

/**
 * Get all repositories with optional statistics
 */
export async function getAllRepositories(includeStats: boolean = false): Promise<Repository[]> {
  const pool = connectDB();
  
  try {
    if (includeStats) {
      // Get repositories with PR and review counts
      const [rows] = await pool.execute<RepositoryRow[]>(`
        SELECT 
          r.id,
          r.github_repo_id,
          r.owner,
          r.name,
          CONCAT(r.owner, '/', r.name) as full_name,
          r.description,
          r.url,
          r.html_url,
          r.is_private,
          r.default_branch,
          r.language,
          r.stars_count,
          r.forks_count,
          r.created_at,
          r.updated_at,
          COUNT(DISTINCT pr.id) as pr_count,
          COUNT(DISTINCT ce.id) as review_count
        FROM repositories r
        LEFT JOIN pull_requests pr ON r.github_repo_id = pr.github_repo_id
        LEFT JOIN code_evaluations ce ON r.github_repo_id = ce.github_repo_id
        GROUP BY r.id, r.github_repo_id, r.owner, r.name, r.description, 
                 r.url, r.html_url, r.is_private, r.default_branch, r.language, 
                 r.stars_count, r.forks_count, r.created_at, r.updated_at
        ORDER BY r.created_at DESC
      `);
      
      return rows.map((row: any) => ({
        ...rowToRepository(row),
        prCount: Number(row.pr_count || 0),
        reviewCount: Number(row.review_count || 0),
      }));
    } else {
      // Get repositories without stats (faster)
      const [rows] = await pool.execute<RepositoryRow[]>(`
        SELECT 
          id,
          github_repo_id,
          owner,
          name,
          CONCAT(owner, '/', name) as full_name,
          description,
          url,
          html_url,
          is_private,
          default_branch,
          language,
          stars_count,
          forks_count,
          created_at,
          updated_at
        FROM repositories
        ORDER BY created_at DESC
      `);
      
      return rows.map(rowToRepository);
    }
  } catch (err: any) {
    // If columns don't exist, fall back to basic columns only
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log("⚠️  Repository table missing new columns. Using basic columns only. Run 'npm run migrate-repositories' to add them.");
      
      if (includeStats) {
        const [rows] = await pool.execute<RepositoryRow[]>(`
          SELECT 
            r.id,
            r.github_repo_id,
            r.owner,
            r.name,
            CONCAT(r.owner, '/', r.name) as full_name,
            r.created_at,
            COUNT(DISTINCT pr.id) as pr_count,
            COUNT(DISTINCT ce.id) as review_count
          FROM repositories r
          LEFT JOIN pull_requests pr ON r.github_repo_id = pr.github_repo_id
          LEFT JOIN code_evaluations ce ON r.github_repo_id = ce.github_repo_id
          GROUP BY r.id, r.github_repo_id, r.owner, r.name, r.created_at
          ORDER BY r.created_at DESC
        `);
        
        return rows.map((row: any) => {
          const repo = rowToRepository({
            ...row,
            description: null,
            url: null,
            html_url: null,
            is_private: false,
            default_branch: 'main',
            language: null,
            stars_count: 0,
            forks_count: 0,
            updated_at: row.created_at,
          });
          return {
            ...repo,
            prCount: Number(row.pr_count || 0),
            reviewCount: Number(row.review_count || 0),
          };
        });
      } else {
        const [rows] = await pool.execute<RepositoryRow[]>(`
          SELECT 
            id,
            github_repo_id,
            owner,
            name,
            CONCAT(owner, '/', name) as full_name,
            created_at
          FROM repositories
          ORDER BY created_at DESC
        `);
        
        return rows.map((row: any) => rowToRepository({
          ...row,
          description: null,
          url: null,
          html_url: null,
          is_private: false,
          default_branch: 'main',
          language: null,
          stars_count: 0,
          forks_count: 0,
          updated_at: row.created_at,
        }));
      }
    } else {
      throw err;
    }
  }
}

/**
 * Get repository by GitHub repo ID
 */
export async function getRepositoryByGithubId(githubRepoId: number): Promise<Repository | null> {
  const pool = connectDB();
  const [rows] = await pool.execute<RepositoryRow[]>(
    `SELECT * FROM repositories WHERE github_repo_id = ?`,
    [githubRepoId]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  return rowToRepository(rows[0]);
}

/**
 * Get repository by full name (owner/name)
 */
export async function getRepositoryByFullName(fullName: string): Promise<Repository | null> {
  const pool = connectDB();
  const [owner, name] = fullName.split("/");
  
  if (!owner || !name) {
    return null;
  }
  
  const [rows] = await pool.execute<RepositoryRow[]>(
    `SELECT * FROM repositories WHERE owner = ? AND name = ?`,
    [owner.trim(), name.trim()]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  return rowToRepository(rows[0]);
}

/**
 * Get repositories with agent assignments
 */
export interface RepositoryWithAgents extends Repository {
  assignedAgents: Array<{
    agentId: string;
    agentName: string;
  }>;
}

export async function getRepositoriesWithAgents(): Promise<RepositoryWithAgents[]> {
  const pool = connectDB();
  
  // Get all repositories
  const repositories = await getAllRepositories(false);
  
  // Get all agents with their repository mappings from the mapping table
  const [agentRows] = await pool.execute<RowDataPacket[]>(`
    SELECT id, name FROM agents
  `);
  
  // Build a map of repository full names to agents
  const repoAgentMap = new Map<string, Array<{ agentId: string; agentName: string }>>();
  
  for (const agent of agentRows) {
    const repos = await agentReposQueries.getRepositoriesForAgent(agent.id);
    
    repos.forEach((repoFullName: string) => {
      if (!repoAgentMap.has(repoFullName)) {
        repoAgentMap.set(repoFullName, []);
      }
      repoAgentMap.get(repoFullName)!.push({
        agentId: agent.id,
        agentName: agent.name,
      });
    });
  }
  
  // Combine repositories with their assigned agents
  return repositories.map((repo) => ({
    ...repo,
    assignedAgents: repoAgentMap.get(repo.fullName) || [],
  }));
}

