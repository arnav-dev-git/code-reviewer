import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuid } from "uuid";
import type { Agent } from "./agentTypes";
import { loadAgents, saveAgents } from "./agentStorage";

const now = () => new Date().toISOString();

const createDefaultAgent = (): Agent => ({
  id: uuid(),
  name: "Security Expert",
  description: "Focus on auth, input validation, secrets, and common vulnerabilities.",
  generationPromptHtml: "<p>You are a senior security reviewer.</p><p>Code: <code>{code_chunk}</code></p>",
  evaluationPromptHtml: "<p>Evaluate relevance, accuracy, actionability, clarity, helpfulness. JSON only.</p>",
  variables: ["{code_chunk}", "{file_type}", "{context}"],
  evaluationDimensions: { relevance: true, accuracy: true, actionability: true, clarity: true, helpfulness: true },
  settings: { enabled: true, severityThreshold: 6, fileTypeFilters: ["ts","js"], repositories: [] },
  createdAt: now(),
  updatedAt: now(),
});

const slice = createSlice({
  name: "agents",
  initialState: { agents: loadAgents() as Agent[] },
  reducers: {
    createAgent(state) {
      state.agents.unshift(createDefaultAgent());
      saveAgents(state.agents);
    },
    upsertAgent(state, action: PayloadAction<Agent>) {
      const i = state.agents.findIndex(a => a.id === action.payload.id);
      if (i >= 0) state.agents[i] = action.payload;
      else state.agents.unshift(action.payload);
      saveAgents(state.agents);
    },
    deleteAgent(state, action: PayloadAction<string>) {
      state.agents = state.agents.filter(a => a.id !== action.payload);
      saveAgents(state.agents);
    },
  },
});

export const { createAgent, upsertAgent, deleteAgent } = slice.actions;
export default slice.reducer;
