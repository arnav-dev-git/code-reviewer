import path from "path";
import { Request, Response } from "express";
import { getInstallationToken } from "../../../githubAuth";
import {
  fetchPullRequestFiles,
  parsePatch,
  postReviewComment,
} from "./PRUtils";
import getCodeReview from "../../../utils/promptHandler/promptHandler";

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
    repoFullName: req.body.repository.full_name,
    owner: req.body.repository.owner.login,
    repo: req.body.repository.name,
    prNumber: req.body.number,
    prTitle: req.body.pull_request.title,
    prUrl: req.body.pull_request.html_url,
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
  console.log("🧠 Code Review:", codeReview);

  if (!codeReview) {
    return res.sendStatus(200);
  }

  const reviewCommentUploadStatus = await postReviewComment(
    token,
    payload.owner,
    payload.repo,
    payload.prNumber,
    codeReview
  );
  console.log("💬 Review Comment Upload Status:", reviewCommentUploadStatus);

  res.sendStatus(200);
};
