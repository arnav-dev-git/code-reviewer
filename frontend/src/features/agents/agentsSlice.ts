import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Agent } from "./agentTypes";
import { agentsApi } from "../../services/api";

interface AgentsState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
}

const initialState: AgentsState = {
  agents: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchAgents = createAsyncThunk("agents/fetchAll", async () => {
  return await agentsApi.getAll();
});

export const fetchAgentById = createAsyncThunk("agents/fetchById", async (id: string) => {
  return await agentsApi.getById(id);
});

export const createAgent = createAsyncThunk(
  "agents/create",
  async (agent: Omit<Agent, "createdAt" | "updatedAt">) => {
    return await agentsApi.create(agent);
  }
);

export const updateAgent = createAsyncThunk(
  "agents/update",
  async (agent: Omit<Agent, "createdAt">) => {
    return await agentsApi.update(agent);
  }
);

export const deleteAgent = createAsyncThunk("agents/delete", async (id: string) => {
  await agentsApi.delete(id);
  return id;
});

const slice = createSlice({
  name: "agents",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all agents
    builder
      .addCase(fetchAgents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.loading = false;
        state.agents = action.payload;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch agents";
      });

    // Fetch agent by ID
    builder
      .addCase(fetchAgentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.agents.findIndex((a) => a.id === action.payload.id);
        if (index >= 0) {
          state.agents[index] = action.payload;
        } else {
          state.agents.push(action.payload);
        }
      })
      .addCase(fetchAgentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch agent";
      });

    // Create agent
    builder
      .addCase(createAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAgent.fulfilled, (state, action) => {
        state.loading = false;
        state.agents.unshift(action.payload);
      })
      .addCase(createAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create agent";
      });

    // Update agent
    builder
      .addCase(updateAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAgent.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.agents.findIndex((a) => a.id === action.payload.id);
        if (index >= 0) {
          state.agents[index] = action.payload;
        }
      })
      .addCase(updateAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update agent";
      });

    // Delete agent
    builder
      .addCase(deleteAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.loading = false;
        state.agents = state.agents.filter((a) => a.id !== action.payload);
      })
      .addCase(deleteAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete agent";
      });
  },
});

export const { clearError } = slice.actions;
export default slice.reducer;
