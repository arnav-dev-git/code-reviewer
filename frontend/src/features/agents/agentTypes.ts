export type EvaluationDimensions = {
  relevance: boolean;
  accuracy: boolean;
  actionability: boolean;
  clarity: boolean;
  helpfulness: boolean;
};

export type AgentSettings = {
  enabled: boolean;
  severityThreshold: number;
  fileTypeFilters: string[];
  repositories: string[];
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  generationPromptHtml: string;
  evaluationPromptHtml: string;
  variables: string[];
  evaluationDimensions: EvaluationDimensions;
  settings: AgentSettings;
  createdAt: string;
  updatedAt: string;
};
