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

export const githubWebhook = async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"];
  const action = req.body.action;

  if (event !== "pull_request") {
    return res.sendStatus(200);
  }

  if (!["opened", "synchronize"].includes(action)) {
    return res.sendStatus(200);
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
  };

  const token = await getInstallationToken(payload.installationId);

  const files = await fetchPullRequestFiles(
    token,
    payload.owner,
    payload.repo,
    payload.prNumber
  );

  // console.log(files);

  let changes: {
    filename: string;
    patch: string;
    changes: number;
  }[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    changes.push({
      filename: file.filename,
      patch: file.patch,
      changes: file.changes,
    });
  }

  const codeReview = await getCodeReview(JSON.stringify(changes));
  // console.log("🧠 Code Review:", codeReview);

  if (!codeReview) {
    return res.sendStatus(200);
  }

  /**
   * DB STORAGE
   */
  try {
    await withTransaction(async (conn) => {
      await insertOrUpdateRepository(conn, {
        githubRepoId: payload.repoId,
        owner: payload.owner,
        name: payload.repo,
      });
      
      await insertOrUpdatePullRequest(conn, {
        githubRepoId: payload.repoId,
        prNumber: payload.prNumber,
        title: payload.prTitle,
        author: payload.prAuthor,
        headSha: payload.prHeadSha,
      });
      
      await insertCodeEvaluation(conn, {
        githubRepoId: payload.repoId,
        prNumber: payload.prNumber,
        agentId: 1,
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
        agentId: 1,
        headSha: payload.prHeadSha,
        status: "success",
      });
    });
  } catch (err) {
    console.error("❌ DB persistence failed:", err);
    throw err;
    // webhook intentionally does not fail
  }

  const reviewCommentUploadStatus = await postReviewComment(
    token,
    payload.owner,
    payload.repo,
    payload.prNumber,
    codeReview
  );
  // console.log("💬 Review Comment Upload Status:", reviewCommentUploadStatus);
  console.log("✅ Review Comment Uploaded Successfully");

  res.sendStatus(200);
};
