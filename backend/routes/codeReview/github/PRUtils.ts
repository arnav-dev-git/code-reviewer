import axios from "axios";
import { ICodeEvaluation } from "../../../types/llmResponseTypes";

export async function fetchPullRequestFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return response.data;
}

export function parsePatch(patch: string) {
  const lines = patch.split("\n");

  let startLine = 0;
  const addedLines: string[] = [];

  for (const line of lines) {
    // @@ -97,5 +97,9 @@
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)/);
      if (match) {
        startLine = parseInt(match[1], 10);
      }
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines.push(line.slice(1));
    }
  }

  return {
    startLine,
    addedLines,
  };
}

export function formatReviewCommentMD(reviewComment: ICodeEvaluation): string {
  const { scores, justification, overall_summary } = reviewComment;

  const scoreEmoji = (score: number) => {
    if (score >= 8) return "🟢";
    if (score >= 5) return "🟡";
    return "🔴";
  };

  const scoreLine = (label: string, score: number) =>
    `- **${label}**: ${score}/10 ${scoreEmoji(score)}`;

  return `
## 🧠 Automated Code Review

### 📊 Summary Scores
${scoreLine("Correctness", scores.correctness)}
${scoreLine("Security", scores.security)}
${scoreLine("Maintainability", scores.maintainability)}
${scoreLine("Clarity", scores.clarity)}
${scoreLine("Production Readiness", scores.production_readiness)}

---

### 🔍 Detailed Analysis

#### ✅ Correctness
${justification.correctness}

#### 🔐 Security
${justification.security}

#### 🛠 Maintainability
${justification.maintainability}

#### ✍️ Clarity
${justification.clarity}

#### 🚀 Production Readiness
${justification.production_readiness}

---

### 🧾 Overall Summary
${overall_summary}
`.trim();
}

async function getPendingReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
) {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return res.data.find(
    (review: any) => review.state === "PENDING" && review.user?.type === "Bot"
  );
}

async function submitPendingReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  reviewId: number,
  body: string
) {
  return axios.post(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews/${reviewId}/events`,
    {
      event: "COMMENT",
      body,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
}

export async function postReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  comment: ICodeEvaluation
) {
  const formattedComment = formatReviewCommentMD(comment);

  const pendingReview = await getPendingReview(token, owner, repo, prNumber);

  if (pendingReview) {
    return submitPendingReview(
      token,
      owner,
      repo,
      prNumber,
      pendingReview.id,
      formattedComment
    );
  }

  return axios.post(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      body: formattedComment,
      event: "COMMENT",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
}
