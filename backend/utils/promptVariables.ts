/**
 * Extract variables from prompt text/HTML
 * Variables are in the format {variable_name}
 */
export function extractVariables(prompt: string): string[] {
  const variableRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const matches = prompt.matchAll(variableRegex);
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(`{${match[1]}}`);
  }
  
  return Array.from(variables);
}

/**
 * Replace variables in prompt with actual values
 * @param prompt - The prompt text/HTML
 * @param variables - Object mapping variable names (without braces) to values
 * @returns Prompt with variables replaced
 */
export function replaceVariables(
  prompt: string,
  variables: Record<string, string>
): string {
  let result = prompt;
  
  for (const [key, value] of Object.entries(variables)) {
    // Replace both {key} and { key } (with spaces)
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Get default variable values for common variables
 */
export function getDefaultVariableValues(
  codeChunk?: string,
  fileType?: string,
  context?: string
): Record<string, string> {
  return {
    code_chunk: codeChunk || '',
    file_type: fileType || 'unknown',
    context: context || '',
  };
}

