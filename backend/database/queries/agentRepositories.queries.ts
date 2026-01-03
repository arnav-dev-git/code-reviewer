import connectDB from "../connection.js";
import { RowDataPacket, OkPacket } from "mysql2/promise";

export interface AgentRepositoryRow extends RowDataPacket {
  id: number;
  agent_id: string;
  repository_full_name: string;
  created_at: Date;
}

/**
 * Get all repository full names for an agent
 */
export async function getRepositoriesForAgent(agentId: string): Promise<string[]> {
  const pool = connectDB();
  const [rows] = await pool.execute<AgentRepositoryRow[]>(
    `SELECT repository_full_name FROM agent_repositories WHERE agent_id = ? ORDER BY created_at ASC`,
    [agentId]
  );
  return rows.map((row) => row.repository_full_name);
}

/**
 * Get all agents for a repository (by full name)
 */
export async function getAgentsForRepository(repositoryFullName: string): Promise<string[]> {
  const pool = connectDB();
  const [rows] = await pool.execute<AgentRepositoryRow[]>(
    `SELECT agent_id FROM agent_repositories WHERE repository_full_name = ?`,
    [repositoryFullName]
  );
  return rows.map((row) => row.agent_id);
}


/**
 * Set repositories for an agent (replaces existing)
 */
export async function setRepositoriesForAgent(
  agentId: string,
  repositoryFullNames: string[]
): Promise<void> {
  console.log("📝 setRepositoriesForAgent called with:", {
    agentId,
    repositoryFullNames,
    count: repositoryFullNames.length
  });
  
  const pool = connectDB();
  
  // Start transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // Delete existing mappings
    const [deleteResult] = await connection.execute<OkPacket>(
      `DELETE FROM agent_repositories WHERE agent_id = ?`,
      [agentId]
    );
    console.log(`🗑️ Deleted ${deleteResult.affectedRows} existing mapping(s) for agent ${agentId}`);
    
    // Insert new mappings
    if (repositoryFullNames.length > 0) {
      // Filter out empty/whitespace-only repository names
      const validRepos = repositoryFullNames.filter((r) => r && r.trim() !== "");
      
      if (validRepos.length > 0) {
        const values = validRepos.map(() => "(?, ?)").join(", ");
        const params = validRepos.flatMap((repo) => [agentId, repo.trim()]);
        
        console.log("💾 Inserting repositories:", validRepos);
        console.log("💾 SQL:", `INSERT INTO agent_repositories (agent_id, repository_full_name) VALUES ${values}`);
        
        const [insertResult] = await connection.execute<OkPacket>(
          `INSERT INTO agent_repositories (agent_id, repository_full_name) VALUES ${values}`,
          params
        );
        
        console.log(`✅ Inserted ${insertResult.affectedRows} repository mapping(s)`);
      } else {
        console.log("⚠️ No valid repositories to insert (all were empty/whitespace)");
      }
    } else {
      console.log("⚠️ No repositories to insert (array is empty)");
    }
    
    await connection.commit();
    console.log("✅ Transaction committed successfully");
  } catch (error) {
    console.error("❌ Error in setRepositoriesForAgent:", error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Add a repository to an agent
 */
export async function addRepositoryToAgent(
  agentId: string,
  repositoryFullName: string
): Promise<void> {
  const pool = connectDB();
  
  await pool.execute<OkPacket>(
    `INSERT IGNORE INTO agent_repositories (agent_id, repository_full_name) VALUES (?, ?)`,
    [agentId, repositoryFullName]
  );
}

/**
 * Remove a repository from an agent
 */
export async function removeRepositoryFromAgent(
  agentId: string,
  repositoryFullName: string
): Promise<void> {
  const pool = connectDB();
  
  await pool.execute<OkPacket>(
    `DELETE FROM agent_repositories WHERE agent_id = ? AND repository_full_name = ?`,
    [agentId, repositoryFullName]
  );
}

/**
 * Check if an agent should review a repository
 * Returns true if:
 * - Agent is enabled AND
 * - (Agent has no repository mappings OR repository is in the mapping)
 */
export async function shouldAgentReviewRepository(
  agentId: string,
  repositoryFullName: string
): Promise<boolean> {
  const pool = connectDB();
  
  // Get agent settings to check if enabled
  const [agentRows] = await pool.execute<RowDataPacket[]>(
    `SELECT settings FROM agents WHERE id = ?`,
    [agentId]
  );
  
  if (agentRows.length === 0) {
    return false;
  }
  
  const settings = typeof agentRows[0].settings === "string"
    ? JSON.parse(agentRows[0].settings)
    : agentRows[0].settings;
  
  // Check if agent is enabled
  if (!settings?.enabled) {
    return false;
  }
  
  // Get repository mappings for this agent
  const repositories = await getRepositoriesForAgent(agentId);
  
  // If no repositories mapped, agent reviews all repositories
  if (repositories.length === 0) {
    return true;
  }
  
  // Check if repository is in the mapping
  const normalizedRepo = repositoryFullName.trim().toLowerCase();
  return repositories.some((repo) => {
    const normalizedMappedRepo = repo.trim().toLowerCase();
    // Exact match
    if (normalizedMappedRepo === normalizedRepo) {
      return true;
    }
    // Check if repo ends with /name (e.g., "owner/repo" matches "org/owner/repo")
    if (normalizedRepo.endsWith(`/${normalizedMappedRepo}`)) {
      return true;
    }
    return false;
  });
}

/**
 * Get all agents that should review a repository
 */
export async function getAgentsForRepositoryReview(repositoryFullName: string): Promise<string[]> {
  const pool = connectDB();
  
  // Get all enabled agents
  const [agentRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM agents WHERE JSON_EXTRACT(settings, '$.enabled') = true`
  );
  
  const agentIds = agentRows.map((row) => row.id);
  const matchingAgents: string[] = [];
  
  // Check each agent
  for (const agentId of agentIds) {
    const shouldReview = await shouldAgentReviewRepository(agentId, repositoryFullName);
    if (shouldReview) {
      matchingAgents.push(agentId);
    }
  }
  
  return matchingAgents;
}

