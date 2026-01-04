import { Request, Response } from "express";
import { getInstallationToken } from "../../../githubAuth";
import { fetchPullRequestFiles, postReviewComment } from "./PRUtils";
import getCodeReview from "../../../utils/promptHandler/promptHandler";
import withTransaction from "../../../database/withTransaction.js";
import {
  insertOrUpdateRepository,
  insertOrUpdatePullRequest,
  insertCodeEvaluation,
  insertEvaluationRun,
} from "../../../database/queries/evalution.queries.js";
import {
  getAgentsForReview,
  getFileExtension,
} from "../../../database/queries/agents.queries.js";
import { replaceVariables, getDefaultVariableValues } from "../../../utils/promptVariables.js";
import { normalizeCodeReview } from "../../../utils/normalizeCodeReview.js";


async function processWebhook(payload: any, token: string) {
  try {
    const files = await fetchPullRequestFiles(
      token,
      payload.owner,
      payload.repo,
      payload.prNumber
    );

    try {
      await withTransaction(async (conn) => {
        await insertOrUpdateRepository(conn, {
          githubRepoId: payload.repoId,
          owner: payload.owner,
          name: payload.repo,
          fullName: payload.repoFullName,
          description: payload.repository?.description || null,
          url: payload.repository?.url || null,
          htmlUrl: payload.repository?.htmlUrl || null,
          isPrivate: payload.repository?.isPrivate || false,
          defaultBranch: payload.repository?.defaultBranch || 'main',
          language: payload.repository?.language || null,
          starsCount: payload.repository?.starsCount || 0,
          forksCount: payload.repository?.forksCount || 0,
        });
        
        await insertOrUpdatePullRequest(conn, {
          githubRepoId: payload.repoId,
          prNumber: payload.prNumber,
          title: payload.prTitle,
          author: payload.prAuthor,
          headSha: payload.prHeadSha,
        });
      });
    } catch (err) {
      console.error("❌ Failed to store repository/PR info:", err);
    }

    for (const file of files) {
      if (!file.patch) continue;

    const fileExtension = getFileExtension(file.filename);

    const agents = await getAgentsForReview(payload.repoFullName, fileExtension);
    
    if (agents.length === 0) {
      console.log(`⏭️  Skipping ${file.filename} in ${payload.repoFullName} - no matching agents found`);
      continue;
    }

      console.log(`🤖 Found ${agents.length} agent(s) for ${file.filename}: ${agents.map(a => a.name).join(", ")}`);

      // Process with each matching agent
      for (const agent of agents) {
        try {
          const changes = [{
            filename: file.filename,
            patch: file.patch,
            changes: file.changes,
          }];


          // Replace variables in prompt using utility function
          const variableValues = getDefaultVariableValues(
            file.patch || "",
            fileExtension || "unknown",
            `Repository: ${payload.repoFullName}, PR: #${payload.prNumber}`
          );
          
          const promptWithVariables = replaceVariables(agent.promptHtml, variableValues);
          
          const codeReviewRaw = await getCodeReview(JSON.stringify(changes), promptWithVariables);
          
          if (!codeReviewRaw) {
            console.log(`⚠️  No review generated for ${file.filename} by ${agent.name}`);
            continue;
          }

          // Normalize the code review result to ensure consistent structure
          const codeReview = normalizeCodeReview(codeReviewRaw);
          
          // Log normalized result for debugging
          console.log(`📊 Normalized code review for ${file.filename}:`, {
            scores: codeReview.scores,
            hasJustification: !!codeReview.justification,
            overallSummary: codeReview.overall_summary?.substring(0, 100) + '...',
          });
          
          // Validate that required fields exist
          if (!codeReview.scores || !codeReview.justification) {
            console.error(`❌ Invalid code review structure for ${file.filename}:`, JSON.stringify(codeReviewRaw, null, 2));
            continue;
          }

          try {
            await withTransaction(async (conn) => {
              const evaluationData = {
                githubRepoId: payload.repoId,
                prNumber: payload.prNumber,
                agentId: agent.id,
                scores: { 
                  correctness: codeReview.scores.correctness,
                  security: codeReview.scores.security,
                  maintainability: codeReview.scores.maintainability,
                  clarity: codeReview.scores.clarity,
                  productionReadiness: codeReview.scores.production_readiness,  
                },
                reasons: {
                  correctness: codeReview.justification.correctness,
                  security: codeReview.justification.security,
                  maintainability: codeReview.justification.maintainability,
                  clarity: codeReview.justification.clarity,
                  productionReadiness: codeReview.justification.production_readiness,
                },
                overallSummary: codeReview.overall_summary,
              };
              
              console.log(`💾 Saving evaluation for ${file.filename}:`, {
                scores: evaluationData.scores,
                agentId: evaluationData.agentId,
                prNumber: evaluationData.prNumber,
              });
              
              await insertCodeEvaluation(conn, evaluationData);
              
              await insertEvaluationRun(conn, {
                githubRepoId: payload.repoId,
                prNumber: payload.prNumber,
                agentId: agent.id,
                headSha: payload.prHeadSha,
                status: "success",
              });
              
              console.log(`✅ Successfully saved evaluation for ${file.filename} by ${agent.name}`);
            });
          } catch (dbErr) {
            console.error(`❌ DB persistence failed for ${file.filename}:`, dbErr);
            console.error(`❌ Error details:`, {
              message: dbErr instanceof Error ? dbErr.message : String(dbErr),
              stack: dbErr instanceof Error ? dbErr.stack : undefined,
            });
          }

          try {
            await postReviewComment(
              token,
              payload.owner,
              payload.repo,
              payload.prNumber,
              codeReview,
              agent.name
            );
            console.log(`✅ Review comment posted by ${agent.name} for ${file.filename}`);
          } catch (commentErr) {
            console.error(`❌ Failed to post comment for ${file.filename} by ${agent.name}:`, commentErr);
            console.error(`❌ Comment error details:`, {
              message: commentErr instanceof Error ? commentErr.message : String(commentErr),
              response: (commentErr as any)?.response?.data,
            });
          }
        } catch (err) {
          console.error(`❌ Error processing ${file.filename} with agent ${agent.name}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
  }
}

export const githubWebhook = async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"];
  const action = req.body.action;

  res.sendStatus(200);

  if (event !== "pull_request") {
    return;
  }

  if (!["opened", "synchronize"].includes(action)) {
    return;
  }

  const payload = {
    repoId: req.body.repository.id,
    repoFullName: req.body.repository.full_name,
    owner: req.body.repository.owner.login,
    repo: req.body.repository.name,
    prNumber: req.body.number,
    prTitle: req.body.pull_request.title,
    prAuthor: req.body.pull_request.user.login,
    prHeadSha: req.body.pull_request.head.sha,
    installationId: req.body.installation.id,
    // Repository metadata
    repository: {
      description: req.body.repository?.description || null,
      url: req.body.repository?.url || null,
      htmlUrl: req.body.repository?.html_url || null,
      isPrivate: req.body.repository?.private || false,
      defaultBranch: req.body.repository?.default_branch || 'main',
      language: req.body.repository?.language || null,
      starsCount: req.body.repository?.stargazers_count || 0,
      forksCount: req.body.repository?.forks_count || 0,
    },
  };

  getInstallationToken(payload.installationId)
    .then((token) => {
      processWebhook(payload, token).catch((err) => {
        console.error("❌ Error in async webhook processing:", err);
      });
    })
    .catch((err) => {
      console.error("❌ Error getting installation token:", err);
    });
};
