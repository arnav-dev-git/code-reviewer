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


          let promptWithVariables = agent.promptHtml;
          if (agent.variables && agent.variables.length > 0) {
            // Replace {code_chunk} with actual code
            if (promptWithVariables.includes("{code_chunk}")) {
              promptWithVariables = promptWithVariables.replace(
                /{code_chunk}/g,
                file.patch || ""
              );
            }
            // Replace {file_type} with file extension
            if (promptWithVariables.includes("{file_type}")) {
              promptWithVariables = promptWithVariables.replace(
                /{file_type}/g,
                fileExtension || "unknown"
              );
            }
            // Replace {context} with additional context if needed
            if (promptWithVariables.includes("{context}")) {
              promptWithVariables = promptWithVariables.replace(
                /{context}/g,
                `Repository: ${payload.repoFullName}, PR: #${payload.prNumber}`
              );
            }
          }
          
          const codeReview = await getCodeReview(JSON.stringify(changes), promptWithVariables);
          
          if (!codeReview) {
            console.log(`⚠️  No review generated for ${file.filename} by ${agent.name}`);
            continue;
          }


          try {
            await withTransaction(async (conn) => {
              await insertCodeEvaluation(conn, {
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
              });
              
            await insertEvaluationRun(conn, {
              githubRepoId: payload.repoId,
              prNumber: payload.prNumber,
              agentId: agent.id,
              headSha: payload.prHeadSha,
              status: "success",
            });
            });
          } catch (dbErr) {
            console.error(`❌ DB persistence failed for ${file.filename}:`, dbErr);
          }

          try {
            await postReviewComment(
              token,
              payload.owner,
              payload.repo,
              payload.prNumber,
              codeReview
            );
            console.log(`✅ Review comment posted by ${agent.name} for ${file.filename}`);
          } catch (commentErr) {
            console.error(`❌ Failed to post comment for ${file.filename}:`, commentErr);
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
