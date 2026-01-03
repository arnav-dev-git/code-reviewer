import fs from "fs";
import path from "path";
import { fileURLToPath } from 'node:url';
import OpenAI from "openai";
import { ICodeEvaluation } from "../../../types/llmResponseTypes";

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

function getPromptText(filePath: string) {
  return fs.readFileSync(`${__dirname}/${filePath}`, "utf8");
}

function getSystemPrompt() {
  return getPromptText("systemPrompt.txt");
}

function getDefaultPrompt() {
  return getPromptText("defaultPrompt.txt");
}

function getPromptBody() {
  return getPromptText("promptBody.txt");
}

function getPrompt(codeChanges: string, _promptBody: string | null = null) {
  const systemPrompt = getSystemPrompt();
  const defaultPrompt = getDefaultPrompt();
  let promptBody = _promptBody || getPromptBody();

  promptBody = promptBody.replace("{code_changes}", codeChanges || "");
  promptBody = promptBody.replace("{user_evaluation_prompt}", _promptBody || defaultPrompt);

  return {
    systemPrompt,
    promptBody,
  };
}

export async function getCodeReviewFromChatGPT(
  codeChanges: string,
  reviewInstructionPrompt: string | null = null,
  retryCount: number = 0
) {
  try {
    const { systemPrompt, promptBody } = getPrompt(codeChanges, reviewInstructionPrompt);

    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-5.2",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: promptBody,
        },
      ],
    });

    return JSON.parse(response.output_text) as ICodeEvaluation;
  } catch (error: any) {
    if (retryCount < 3) {
      return getCodeReviewFromChatGPT(codeChanges, reviewInstructionPrompt, retryCount + 1);
    }
    throw error;
  }
}
