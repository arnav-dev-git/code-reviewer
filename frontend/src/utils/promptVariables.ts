/**
 * Extract variables from prompt HTML/text
 * Variables are in the format {variable_name}
 */
export function extractVariables(prompt: string): string[] {
  // Remove HTML tags to get plain text, then extract variables
  const textContent = prompt.replace(/<[^>]*>/g, '');
  const variableRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const matches = Array.from(textContent.matchAll(variableRegex));
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(`{${match[1]}}`);
  }
  
  return Array.from(variables);
}

/**
 * Replace variables in prompt HTML with actual values
 * @param promptHtml - The prompt HTML
 * @param variables - Object mapping variable names (without braces) to values
 * @returns Prompt HTML with variables replaced
 */
export function replaceVariables(
  promptHtml: string,
  variables: Record<string, string>
): string {
  let result = promptHtml;
  
  for (const [key, value] of Object.entries(variables)) {
    // Replace {key} in HTML (may be in text nodes or attributes)
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Get default variable values for preview
 */
export function getDefaultVariableValues(): Record<string, string> {
  return {
    code_chunk: '// Example code snippet\nfunction example() {\n  return "Hello, World!";\n}',
    file_type: 'js',
    context: 'Repository: owner/repo, PR: #123',
  };
}

