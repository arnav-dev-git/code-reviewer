const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

export const agentsApi = {
  /**
   * Get all agents
   */
  getAll: async (): Promise<Agent[]> => {
    const response = await fetch(`${API_BASE_URL}/agents`);
    return handleResponse<Agent[]>(response);
  },

  /**
   * Get agent by ID
   */
  getById: async (id: string): Promise<Agent> => {
    const response = await fetch(`${API_BASE_URL}/agents/${id}`);
    return handleResponse<Agent>(response);
  },

  /**
   * Create a new agent
   */
  create: async (agent: Omit<Agent, "createdAt" | "updatedAt">): Promise<Agent> => {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agent),
    });
    return handleResponse<Agent>(response);
  },

  /**
   * Update an existing agent
   */
  update: async (agent: Omit<Agent, "createdAt">): Promise<Agent> => {
    const response = await fetch(`${API_BASE_URL}/agents/${agent.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agent),
    });
    return handleResponse<Agent>(response);
  },

  /**
   * Delete an agent
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
      method: "DELETE",
    });
    return handleResponse<void>(response);
  },
};

