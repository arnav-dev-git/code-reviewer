import { Router, Request, Response } from "express";
import * as reviewQueries from "../../../database/queries/reviews.queries.js";

const router = Router();

/**
 * GET /api/reviews
 * Get all reviews with optional filters
 * Query params: agentId, startDate, endDate, limit, offset
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { agentId, startDate, endDate, limit, offset } = req.query;
    
    const filters: any = {};
    if (agentId && typeof agentId === "string") {
      filters.agentId = agentId;
    }
    if (startDate && typeof startDate === "string") {
      filters.startDate = startDate;
    }
    if (endDate && typeof endDate === "string") {
      filters.endDate = endDate;
    }
    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }
    if (offset) {
      filters.offset = parseInt(offset as string, 10);
    }
    
    const reviews = await reviewQueries.getReviews(filters);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/**
 * GET /api/reviews/stats
 * Get review statistics for overview
 * Query params: agentId, startDate, endDate
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { agentId, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (agentId && typeof agentId === "string") {
      filters.agentId = agentId;
    }
    if (startDate && typeof startDate === "string") {
      filters.startDate = startDate;
    }
    if (endDate && typeof endDate === "string") {
      filters.endDate = endDate;
    }
    
    const stats = await reviewQueries.getReviewStats(filters);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({ error: "Failed to fetch review statistics" });
  }
});

export default router;

