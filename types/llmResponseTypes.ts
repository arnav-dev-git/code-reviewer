export interface ICodeEvaluation {
  scores: {
    correctness: number;
    security: number;
    maintainability: number;
    clarity: number;
    production_readiness: number;
  };
  justification: {
    correctness: string;
    security: string;
    maintainability: string;
    clarity: string;
    production_readiness: string;
  };
  overall_summary: string;
}
