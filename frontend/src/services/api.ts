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

export interface Review {
  id: number;
  agentId: string;
  agentName: string;
  agentDescription: string | null;
  repository: string;
  prNumber: number;
  prTitle: string | null;
  prAuthor: string | null;
  scores: {
    correctness: number;
    security: number;
    maintainability: number;
    clarity: number;
    productionReadiness: number;
  };
  reasons: {
    correctness: string | null;
    security: string | null;
    maintainability: string | null;
    clarity: string | null;
    productionReadiness: string | null;
  };
  overallSummary: string | null;
  evaluationModel: string | null;
  evaluationVersion: string | null;
  createdAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageScores: {
    correctness: number;
    security: number;
    maintainability: number;
    clarity: number;
    productionReadiness: number;
  };
  trendData: Array<{
    index: number;
    helpfulness: number;
  }>;
  agentComparison: Array<{
    agentId: string;
    agentName: string;
    avgScore: number;
    reviewCount: number;
  }>;
}

export interface ReviewFilters {
  agentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const reviewsApi = {
  /**
   * Get all reviews with optional filters
   */
  getAll: async (filters?: ReviewFilters): Promise<Review[]> => {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append("agentId", filters.agentId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/reviews${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url);
    return handleResponse<Review[]>(response);
  },

  /**
   * Get review statistics
   */
  getStats: async (filters?: {
    agentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReviewStats> => {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append("agentId", filters.agentId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/reviews/stats${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url);
    return handleResponse<ReviewStats>(response);
  },
};

export interface Repository {
  id: number;
  githubRepoId: number;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  url: string | null;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  starsCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
  prCount?: number;
  reviewCount?: number;
}

export interface RepositoryWithAgents extends Repository {
  assignedAgents: Array<{
    agentId: string;
    agentName: string;
  }>;
}

export const repositoriesApi = {
  /**
   * Get all repositories
   */
  getAll: async (includeStats: boolean = false): Promise<Repository[]> => {
    const url = `${API_BASE_URL}/repositories${includeStats ? "?includeStats=true" : ""}`;
    const response = await fetch(url);
    return handleResponse<Repository[]>(response);
  },

  /**
   * Get repositories with assigned agents
   */
  getWithAgents: async (): Promise<RepositoryWithAgents[]> => {
    const response = await fetch(`${API_BASE_URL}/repositories/with-agents`);
    return handleResponse<RepositoryWithAgents[]>(response);
  },

  /**
   * Get repository by GitHub repo ID
   */
  getByGithubId: async (githubRepoId: number): Promise<Repository> => {
    const response = await fetch(`${API_BASE_URL}/repositories/github/${githubRepoId}`);
    return handleResponse<Repository>(response);
  },

  /**
   * Get repository by full name (owner/name)
   */
  getByFullName: async (fullName: string): Promise<Repository> => {
    const response = await fetch(`${API_BASE_URL}/repositories/fullname/${encodeURIComponent(fullName)}`);
    return handleResponse<Repository>(response);
  },
};

