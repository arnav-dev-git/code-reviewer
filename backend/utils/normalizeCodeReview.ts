import { ICodeEvaluation } from "../types/llmResponseTypes.js";

/**
 * Normalize code review result to ensure consistent structure
 * Handles variations in field names (camelCase vs snake_case) and missing fields
 * Always returns a valid ICodeEvaluation structure
 */
export function normalizeCodeReview(result: any): ICodeEvaluation {
  // Handle null/undefined result
  if (!result || typeof result !== 'object') {
    console.warn('⚠️  Code review result is null/undefined or not an object, using defaults');
    console.warn('⚠️  Raw result:', result);
    result = {};
  }
  
  // Log raw result structure for debugging
  console.log('🔍 Raw code review result structure:', {
    hasScores: !!result.scores,
    hasJustification: !!result.justification,
    hasOverallSummary: !!result.overall_summary,
    keys: Object.keys(result),
    scoresKeys: result.scores ? Object.keys(result.scores) : [],
    justificationKeys: result.justification ? Object.keys(result.justification) : [],
    rawResult: JSON.stringify(result, null, 2).substring(0, 500), // First 500 chars
  });

  // Helper to get nested value with fallback
  const getValue = (obj: any, ...paths: string[]): any => {
    for (const path of paths) {
      const keys = path.split('.');
      let value = obj;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }
      if (value !== undefined) return value;
    }
    return undefined;
  };

  // Normalize scores - handle both camelCase and snake_case
  const scores = {
    correctness: getValue(result, 'scores.correctness', 'scores.correctness_score') ?? 0,
    security: getValue(result, 'scores.security', 'scores.security_score') ?? 0,
    maintainability: getValue(result, 'scores.maintainability', 'scores.maintainability_score') ?? 0,
    clarity: getValue(result, 'scores.clarity', 'scores.clarity_score') ?? 0,
    production_readiness: getValue(
      result,
      'scores.production_readiness',
      'scores.productionReadiness',
      'scores.production_readiness_score'
    ) ?? 0,
  };

  // Normalize justification - handle both camelCase and snake_case
  const justification = {
    correctness: getValue(
      result,
      'justification.correctness',
      'justification.correctness_reason',
      'reasons.correctness'
    ) ?? '',
    security: getValue(
      result,
      'justification.security',
      'justification.security_reason',
      'reasons.security'
    ) ?? '',
    maintainability: getValue(
      result,
      'justification.maintainability',
      'justification.maintainability_reason',
      'reasons.maintainability'
    ) ?? '',
    clarity: getValue(
      result,
      'justification.clarity',
      'justification.clarity_reason',
      'reasons.clarity'
    ) ?? '',
    production_readiness: getValue(
      result,
      'justification.production_readiness',
      'justification.productionReadiness',
      'justification.production_readiness_reason',
      'reasons.production_readiness',
      'reasons.productionReadiness'
    ) ?? '',
  };

  // Normalize overall summary - handle both camelCase and snake_case
  const overall_summary = getValue(
    result,
    'overall_summary',
    'overallSummary',
    'summary',
    'overall_summary_text'
  ) ?? '';

  // Ensure all scores are numbers
  Object.keys(scores).forEach((key) => {
    const value = scores[key as keyof typeof scores];
    if (typeof value !== 'number' || isNaN(value)) {
      console.warn(`⚠️  Score "${key}" is not a valid number (got: ${value}), defaulting to 0`);
      scores[key as keyof typeof scores] = 0;
    } else {
      // Clamp to 0-10 range
      scores[key as keyof typeof scores] = Math.max(0, Math.min(10, Math.round(value)));
    }
  });

  // Ensure all justifications are strings
  Object.keys(justification).forEach((key) => {
    const value = justification[key as keyof typeof justification];
    if (typeof value !== 'string') {
      console.warn(`⚠️  Justification "${key}" is not a string (got: ${typeof value}), converting to string`);
      justification[key as keyof typeof justification] = String(value || '');
    }
  });

  const normalized = {
    scores,
    justification,
    overall_summary: typeof overall_summary === 'string' ? overall_summary : String(overall_summary || ''),
  };
  
  // Log final normalized result
  console.log('✅ Normalized code review:', {
    scores: normalized.scores,
    hasJustification: !!normalized.justification,
    overallSummaryLength: normalized.overall_summary.length,
  });
  
  return normalized;
}

