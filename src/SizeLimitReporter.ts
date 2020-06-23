import { GitHub } from "@actions/github";
import table from "markdown-table";

class SizeLimitReporter {
  octokit: GitHub;

  static HEADING = "## 📦 size-limit report";

  constructor(octokit: GitHub) {
    this.octokit = octokit;
  }

  getBody(isInvalid: boolean, diffResults: Array<Array<string>>): string {
    return [
      SizeLimitReporter.HEADING,
      `Status: ${isInvalid ? "❌" : "✅"}`,
      `<details open>`,
      `<summary>Table</summary>`,
      table(diffResults),
      `</details>`
    ].join("\r\n");
  }

  async fetchPrevious(
    repo: { owner: string; repo: string },
    issueNumber: number
  ) {
    const comments = await this.octokit.paginate(
      "GET /repos/:owner/:repo/issues/:issue_number/comments",
      {
        ...repo,
        issue_number: issueNumber
      }
    );

    return comments.find(comment =>
      comment.body.startsWith(SizeLimitReporter.HEADING)
    );
  }

  create(
    repo: { owner: string; repo: string },
    issueNumber: number,
    body: string
  ) {
    return this.octokit.issues.createComment({
      ...repo,
      issue_number: issueNumber,
      body
    });
  }

  update(
    repo: { owner: string; repo: string },
    commentId: number,
    body: string
  ) {
    return this.octokit.issues.updateComment({
      ...repo,
      comment_id: commentId,
      body
    });
  }

  async comment(
    repo: { owner: string; repo: string },
    issueNumber: number,
    isInvalid: boolean,
    diffResults: Array<Array<string>>
  ) {
    const body = this.getBody(isInvalid, diffResults);
    const comment = await this.fetchPrevious(repo, issueNumber);

    if (comment) {
      return this.update(repo, comment.id, body);
    }

    return this.create(repo, issueNumber, body);
  }
}

export default SizeLimitReporter;
