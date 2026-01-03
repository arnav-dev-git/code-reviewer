import connectDB from "../connection.js";

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


function rowToAgent(row: AgentRow): Agent {
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
    settings: safeJsonParse(row.settings, {
      enabled: true,
      severityThreshold: 6,
      fileTypeFilters: [],
      repositories: [],
    }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}


export async function getAllAgents(): Promise<Agent[]> {
  const pool = connectDB();
  const [rows] = await pool.execute(
    `SELECT * FROM agents ORDER BY created_at DESC`
  ) as [AgentRow[], any];
  return rows.map(rowToAgent);
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
      JSON.stringify(agent.settings),
    ]
  );

  const created = await getAgentById(agent.id);
  if (!created) {
    throw new Error("Failed to retrieve created agent");
  }
  return created;
}


export async function updateAgent(agent: Omit<Agent, "createdAt">): Promise<Agent> {
  const pool = connectDB();
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
      JSON.stringify(agent.settings),
      agent.id,
    ]
  );

  const updated = await getAgentById(agent.id);
  if (!updated) {
    throw new Error("Failed to retrieve updated agent");
  }
  return updated;
}


export async function deleteAgent(id: string): Promise<boolean> {
  const pool = connectDB();
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
  const [rows] = await pool.execute(
    `SELECT * FROM agents WHERE JSON_EXTRACT(settings, '$.enabled') = true`
  ) as [AgentRow[], any];
  
  const allAgents = rows.map(rowToAgent);
  
  console.log(`🔍 Checking ${allAgents.length} enabled agent(s) for repo: ${repoFullName}, file: ${fileExtension}`);
  

  const matchingAgents = allAgents.filter((agent) => {
    const settings = agent.settings;
    
    // Check if agent is enabled
    if (!settings.enabled) {
      console.log(`  ❌ Agent "${agent.name}" is disabled`);
      return false;
    }
    
    // Check repository filter
    if (settings.repositories && settings.repositories.length > 0) {
      console.log(`  📋 Agent "${agent.name}" has repositories: ${JSON.stringify(settings.repositories)}`);
      
      const repoMatches = settings.repositories.some((repo) => {
        const normalizedRepo = repo.trim().toLowerCase();
        const normalizedFullName = repoFullName.trim().toLowerCase();
        
        console.log(`    Comparing: "${normalizedRepo}" with "${normalizedFullName}"`);
        
        // Exact match: "owner/repo" === "owner/repo"
        if (normalizedRepo === normalizedFullName) {
          console.log(`    ✅ Exact match found!`);
          return true;
        }
        

        // if (normalizedFullName.endsWith(`/${normalizedRepo}`)) {
        //   console.log(`    ✅ Partial match found (ends with /${normalizedRepo})`);
        //   return true;
        // }
        

        const repoParts = normalizedRepo.split("/");
        const fullNameParts = normalizedFullName.split("/");
        
        if (repoParts.length === 2 && fullNameParts.length === 2) {
          if (normalizedRepo === normalizedFullName) {
            console.log(`    ✅ Full path match found!`);
            return true;
          }
        }
        
        console.log(`    ❌ No match`);
        return false;
      });
      
      if (!repoMatches) {
        console.log(`  ❌ Agent "${agent.name}" repository filter doesn't match`);
        return false;
      }
      console.log(`  ✅ Agent "${agent.name}" repository filter matches`);
    } else {
      console.log(`  ✅ Agent "${agent.name}" has no repository filter (matches all repos)`);
    }
    
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
        return false;
      }
      console.log(`  ✅ Agent "${agent.name}" file extension filter matches`);
    } else {
      console.log(`  ✅ Agent "${agent.name}" has no file filter (matches all files)`);
    }
    
    console.log(`  ✅✅✅ Agent "${agent.name}" matches all criteria!`);
    return true;
  });
  
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

