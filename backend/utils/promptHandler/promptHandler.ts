import { getCodeReviewFromChatGPT } from "./chatGPT/chatGPT";
import { ICodeEvaluation } from "../../types/llmResponseTypes";

async function getCodeReview(
  codeChanges: string,
  promptBody: string | null = null,
  agent: string = "chatGPT"
) {
  let codeReview: ICodeEvaluation | null = null;
  try {
    if (agent === "chatGPT") {
      codeReview = await getCodeReviewFromChatGPT(codeChanges, promptBody);
    } else {
      throw new Error(`Agent ${agent} not supported`);
    }
  } catch (error: any) {
    console.error(error);
    throw error;
  }
  return codeReview;
}

export default getCodeReview;