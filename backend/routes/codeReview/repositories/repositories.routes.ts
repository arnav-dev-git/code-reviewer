import { Router, Request, Response } from "express";
import * as repositoryQueries from "../../../database/queries/repositories.queries.js";

const router = Router();

/**
 * GET /api/repositories
 * Get all repositories
 * Query params: includeStats (boolean) - include PR and review counts
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeStats = req.query.includeStats === "true";
    const repositories = await repositoryQueries.getAllRepositories(includeStats);
    res.json(repositories);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

/**
 * GET /api/repositories/with-agents
 * Get all repositories with their assigned agents
 */
router.get("/with-agents", async (req: Request, res: Response) => {
  try {
    const repositories = await repositoryQueries.getRepositoriesWithAgents();
    res.json(repositories);
  } catch (error) {
    console.error("Error fetching repositories with agents:", error);
    res.status(500).json({ error: "Failed to fetch repositories with agents" });
  }
});

/**
 * GET /api/repositories/github/:githubRepoId
 * Get repository by GitHub repo ID
 */
router.get("/github/:githubRepoId", async (req: Request, res: Response) => {
  try {
    const { githubRepoId } = req.params;
    const repo = await repositoryQueries.getRepositoryByGithubId(Number(githubRepoId));
    
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }
    
    res.json(repo);
  } catch (error) {
    console.error("Error fetching repository:", error);
    res.status(500).json({ error: "Failed to fetch repository" });
  }
});

/**
 * GET /api/repositories/fullname/:fullName
 * Get repository by full name (owner/name)
 */
router.get("/fullname/:fullName", async (req: Request, res: Response) => {
  try {
    const { fullName } = req.params;
    const repo = await repositoryQueries.getRepositoryByFullName(decodeURIComponent(fullName));
    
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }
    
    res.json(repo);
  } catch (error) {
    console.error("Error fetching repository:", error);
    res.status(500).json({ error: "Failed to fetch repository" });
  }
});

export default router;

