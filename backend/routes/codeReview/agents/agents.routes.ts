import { Router, Request, Response } from "express";
import * as agentQueries from "../../../database/queries/agents.queries.js";

const router = Router();


router.get("/", async (req: Request, res: Response) => {
  try {
    const agents = await agentQueries.getAllAgents();
    console.log(`📊 Found ${agents.length} agent(s) in database:`);
    res.json(agents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});


router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await agentQueries.getAgentById(id);

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});


router.post("/", async (req: Request, res: Response) => {
  try {
    const agentData = req.body;

    if (!agentData.id || !agentData.name) {
      return res.status(400).json({ error: "Agent ID and name are required" });
    }

    const existing = await agentQueries.getAgentById(agentData.id);
    if (existing) {
      return res.status(409).json({ error: "Agent with this ID already exists" });
    }

    const agent = await agentQueries.createAgent({
      id: agentData.id,
      name: agentData.name,
      description: agentData.description || "",
      promptHtml: agentData.promptHtml || "",
      variables: agentData.variables || ["{code_chunk}", "{file_type}", "{context}"],
      evaluationDimensions: agentData.evaluationDimensions || {
        relevance: true,
        accuracy: true,
        actionability: true,
        clarity: true,
        helpfulness: true,
      },
      settings: agentData.settings || {
        enabled: true,
        severityThreshold: 6,
        fileTypeFilters: [],
        repositories: [],
      },
    });

    res.status(201).json(agent);
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to create agent" });
  }
});


router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentData = req.body;

    if (id !== agentData.id) {
      return res.status(400).json({ error: "Agent ID mismatch" });
    }

    const existing = await agentQueries.getAgentById(id);
    if (!existing) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const agent = await agentQueries.updateAgent({
      id: agentData.id,
      name: agentData.name,
      description: agentData.description || "",
      promptHtml: agentData.promptHtml || existing.promptHtml,
      variables: agentData.variables || existing.variables,
      evaluationDimensions: agentData.evaluationDimensions || existing.evaluationDimensions,
      settings: agentData.settings || existing.settings,
      updatedAt: new Date().toISOString(),
    });

    res.json(agent);
  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ error: "Failed to update agent" });
  }
});


router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await agentQueries.deleteAgent(id);

    if (!deleted) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

export default router;

