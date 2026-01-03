import connectDB from "../connection.js";
import * as agentReposQueries from "./agentRepositories.queries.js";

export interface AgentRow {
  id: string;
  name: string;
  description: string;
  prompt_html: string;
  variables: string | any; 
  evaluation_dimensions: string | any;
  settings: string | any;
  created_at: Date;
  updated_at: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  promptHtml: string;
  variables: string[];
  evaluationDimensions: {
    relevance: boolean;
    accuracy: boolean;
    actionability: boolean;
    clarity: boolean;
    helpfulness: boolean;
  };
  settings: {
    enabled: boolean;
    severityThreshold: number;
    fileTypeFilters: string[];
    repositories: string[];
  };
  createdAt: string;
  updatedAt: string;
}


function safeJsonParse(value: any, defaultValue: any = null): any {
  // If value is null or undefined, return default
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // If it's already an object/array, return it directly
  if (typeof value === "object") {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === "string") {
    // If string is empty, return default
    if (value.trim() === "") {
      return defaultValue;
    }
    
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Failed to parse value:", value);
      console.error("Value type:", typeof value);
      console.error("Value length:", value?.length);
      // Return default value instead of throwing
      return defaultValue;
    }
  }
  
  // For any other type, return as-is or default
  return value || defaultValue;
}


async function rowToAgent(row: AgentRow): Promise<Agent> {
  const defaultSettings = {
    enabled: true,
    severityThreshold: 6,
    fileTypeFilters: [],
    repositories: [],
  };
  
  const parsedSettings = safeJsonParse(row.settings, defaultSettings);
  
  // Get repositories from mapping table
  const repositories = await agentReposQueries.getRepositoriesForAgent(row.id);
  
  // Ensure all settings fields are present with defaults
  const settings = {
    enabled: parsedSettings?.enabled ?? defaultSettings.enabled,
    severityThreshold: parsedSettings?.severityThreshold ?? defaultSettings.severityThreshold,
    fileTypeFilters: Array.isArray(parsedSettings?.fileTypeFilters) 
      ? parsedSettings.fileTypeFilters 
      : defaultSettings.fileTypeFilters,
    repositories: repositories.length > 0 ? repositories : (Array.isArray(parsedSettings?.repositories) 
      ? parsedSettings.repositories 
      : defaultSettings.repositories),
  };
  
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    promptHtml: row.prompt_html || "",
    variables: safeJsonParse(row.variables, ["{code_chunk}", "{file_type}", "{context}"]),
    evaluationDimensions: safeJsonParse(row.evaluation_dimensions, {
      relevance: true,
      accuracy: true,
      actionability: true,
      clarity: true,
      helpfulness: true,
    }),
    settings,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}


export async function getAllAgents(): Promise<Agent[]> {
  const pool = connectDB();
  const [rows] = await pool.execute(
    `SELECT * FROM agents ORDER BY created_at DESC`
  ) as [AgentRow[], any];
  return Promise.all(rows.map(rowToAgent));
}


export async function getAgentById(id: string): Promise<Agent | null> {
  const pool = connectDB();
  const [rows] = await pool.execute(
    `SELECT * FROM agents WHERE id = ?`,
    [id]
  ) as [AgentRow[], any];
  if (rows.length === 0) {
    return null;
  }
  return rowToAgent(rows[0]);
}


export async function createAgent(agent: Omit<Agent, "createdAt" | "updatedAt">): Promise<Agent> {
  const pool = connectDB();
  
  // Ensure settings has all required fields
  const settings = {
    enabled: agent.settings?.enabled ?? true,
    severityThreshold: agent.settings?.severityThreshold ?? 6,
    fileTypeFilters: Array.isArray(agent.settings?.fileTypeFilters) 
      ? agent.settings.fileTypeFilters 
      : [],
    repositories: Array.isArray(agent.settings?.repositories) 
      ? agent.settings.repositories 
      : [],
  };
  
  console.log("Creating agent with settings:", JSON.stringify(settings, null, 2));
  
  await pool.execute(
    `INSERT INTO agents (
      id, name, description, prompt_html,
      variables, evaluation_dimensions, settings
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      agent.id,
      agent.name,
      agent.description || "",
      agent.promptHtml,
      JSON.stringify(agent.variables),
      JSON.stringify(agent.evaluationDimensions),
      JSON.stringify(settings),
    ]
  );

  // Sync repositories to mapping table
  console.log("🔄 createAgent - agent.settings:", JSON.stringify(agent.settings, null, 2));
  console.log("🔄 createAgent - agent.settings?.repositories:", agent.settings?.repositories);
  
  const repositories = Array.isArray(agent.settings?.repositories) 
    ? agent.settings.repositories.filter((r: string) => r && r.trim() !== "")
    : [];
  
  console.log("🔄 createAgent - Filtered repositories to sync:", repositories);
  console.log("🔄 createAgent - About to call setRepositoriesForAgent with:", {
    agentId: agent.id,
    repositories: repositories,
    count: repositories.length
  });
  
  await agentReposQueries.setRepositoriesForAgent(agent.id, repositories);
  console.log(`✅ Synced ${repositories.length} repository mapping(s) for agent ${agent.id}`);

  const created = await getAgentById(agent.id);
  if (!created) {
    throw new Error("Failed to retrieve created agent");
  }
  
  console.log("Created agent retrieved:", JSON.stringify(created.settings, null, 2));
  return created;
}


export async function updateAgent(agent: Omit<Agent, "createdAt">): Promise<Agent> {
  const pool = connectDB();
  
  // Ensure settings has all required fields
  const settings = {
    enabled: agent.settings?.enabled ?? true,
    severityThreshold: agent.settings?.severityThreshold ?? 6,
    fileTypeFilters: Array.isArray(agent.settings?.fileTypeFilters) 
      ? agent.settings.fileTypeFilters 
      : [],
    repositories: Array.isArray(agent.settings?.repositories) 
      ? agent.settings.repositories 
      : [],
  };
  
  console.log("Updating agent with settings:", JSON.stringify(settings, null, 2));
  
  await pool.execute(
    `UPDATE agents SET
      name = ?,
      description = ?,
      prompt_html = ?,
      variables = ?,
      evaluation_dimensions = ?,
      settings = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      agent.name,
      agent.description || "",
      agent.promptHtml,
      JSON.stringify(agent.variables),
      JSON.stringify(agent.evaluationDimensions),
      JSON.stringify(settings),
      agent.id,
    ]
  );

  // Sync repositories to mapping table
  console.log("🔄 updateAgent - agent.settings:", JSON.stringify(agent.settings, null, 2));
  console.log("🔄 updateAgent - agent.settings?.repositories:", agent.settings?.repositories);
  
  const repositories = Array.isArray(agent.settings?.repositories) 
    ? agent.settings.repositories.filter((r: string) => r && r.trim() !== "")
    : [];
  
  console.log("🔄 updateAgent - Filtered repositories to sync:", repositories);
  console.log("🔄 updateAgent - About to call setRepositoriesForAgent with:", {
    agentId: agent.id,
    repositories: repositories,
    count: repositories.length
  });
  
  await agentReposQueries.setRepositoriesForAgent(agent.id, repositories);
  console.log(`✅ Synced ${repositories.length} repository mapping(s) for agent ${agent.id}`);

  const updated = await getAgentById(agent.id);
  if (!updated) {
    throw new Error("Failed to retrieve updated agent");
  }
  
  console.log("Updated agent retrieved:", JSON.stringify(updated.settings, null, 2));
  return updated;
}


export async function deleteAgent(id: string): Promise<boolean> {
  const pool = connectDB();
  
  // Delete repository mappings first
  await agentReposQueries.setRepositoriesForAgent(id, []);
  
  // Then delete the agent
  const [result] = await pool.execute(
    `DELETE FROM agents WHERE id = ?`,
    [id]
  );
  const deleteResult = result as any;
  return deleteResult.affectedRows > 0;
}


export async function getAgentsForReview(
  repoFullName: string,
  fileExtension: string
): Promise<Agent[]> {
  const pool = connectDB();
  
  // First check if there are any agents at all
  const [allAgentsRows] = await pool.execute(
    `SELECT COUNT(*) as count FROM agents`
  ) as [any[], any];
  const totalAgents = allAgentsRows[0]?.count || 0;
  
  if (totalAgents === 0) {
    console.log(`⚠️  No agents found in database. Please create an agent first.`);
    return [];
  }
  
  // Get enabled agents
  const [rows] = await pool.execute(
    `SELECT * FROM agents WHERE JSON_EXTRACT(settings, '$.enabled') = true`
  ) as [AgentRow[], any];
  
  const allAgents = await Promise.all(rows.map(rowToAgent));
  
  if (allAgents.length === 0) {
    console.log(`⚠️  No enabled agents found. Total agents: ${totalAgents}. Please enable an agent or create a new one.`);
    return [];
  }
  
  console.log(`🔍 Checking ${allAgents.length} enabled agent(s) for repo: ${repoFullName}, file: ${fileExtension}`);
  

  // Check each agent asynchronously
  const agentChecks = await Promise.all(
    allAgents.map(async (agent) => {
      const settings = agent.settings;
      
      // Check if agent is enabled (already filtered by SQL, but double-check)
      if (!settings.enabled) {
        console.log(`  ❌ Agent "${agent.name}" is disabled`);
        return { agent, shouldReview: false };
      }
      
      // Check repository filter using mapping table
      const shouldReviewRepo = await agentReposQueries.shouldAgentReviewRepository(
        agent.id,
        repoFullName
      );
      
      if (!shouldReviewRepo) {
        console.log(`  ❌ Agent "${agent.name}" repository filter doesn't match`);
        return { agent, shouldReview: false };
      }
      console.log(`  ✅ Agent "${agent.name}" repository filter matches`);
      
      // Check file extension filter
      if (settings.fileTypeFilters && settings.fileTypeFilters.length > 0) {
        console.log(`  📁 Agent "${agent.name}" has file filters: ${JSON.stringify(settings.fileTypeFilters)}`);
        
        // Remove leading dot if present
        const normalizedExt = fileExtension.startsWith(".") 
          ? fileExtension.slice(1) 
          : fileExtension;
        
        const extMatches = settings.fileTypeFilters.some((filter) => {
          const normalizedFilter = filter.startsWith(".") 
            ? filter.slice(1) 
            : filter;
          const matches = normalizedFilter.toLowerCase() === normalizedExt.toLowerCase();
          console.log(`    Comparing: "${normalizedFilter}" with "${normalizedExt}" -> ${matches ? "✅" : "❌"}`);
          return matches;
        });
        
        if (!extMatches) {
          console.log(`  ❌ Agent "${agent.name}" file extension filter doesn't match`);
          return { agent, shouldReview: false };
        }
        console.log(`  ✅ Agent "${agent.name}" file extension filter matches`);
      } else {
        console.log(`  ✅ Agent "${agent.name}" has no file filter (matches all files)`);
      }
      
      console.log(`  ✅✅✅ Agent "${agent.name}" matches all criteria!`);
      return { agent, shouldReview: true };
    })
  );
  
  const matchingAgents = agentChecks
    .filter((check) => check.shouldReview)
    .map((check) => check.agent);
  
  console.log(`🎯 Found ${matchingAgents.length} matching agent(s) out of ${allAgents.length} enabled agents`);
  return matchingAgents;
}


export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ""; // No extension
  }
  return filename.substring(lastDot + 1);
}

