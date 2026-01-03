import "dotenv/config";
import express from "express";
import cors from "cors";

import { githubWebhook } from "./routes/codeReview/github/webhook";
import agentsRouter from "./routes/codeReview/agents/agents.routes";

const app = express();
app.use(cors());
app.use(express.json()); 

const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Running ...");
});

app.get("/api/webhook/github", (req, res) => {
  res.send("Code Doctor API is listening for GitHub webhooks!");
});
app.post("/api/webhook/github", githubWebhook);

// Agents CRUD routes
app.use("/api/agents", agentsRouter);

app.listen(PORT, () => {
  console.clear();
  console.log(`🚀 Server is running on port ${PORT} ...`);
});
