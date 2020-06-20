import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
// @ts-ignore
import table from "markdown-table";
import Term from "./Term";
import SizeLimit from "./SizeLimit";

const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";
const SIZE_LIMIT_HEADING = `## [size-limit](${SIZE_LIMIT_URL}) report`;

async function run() {
  try {
    const { payload, repo } = context;
    const pr = payload.pull_request;

    if (!pr) {
      throw new Error(
        "No PR found. Only pull_request workflows are supported."
      );
    }

    const token = getInput("github_token");
    const skipStep = getInput("skip_step");
    const buildScript = getInput("build_script");
    const octokit = new GitHub(token);
    const term = new Term();
    const limit = new SizeLimit();

    const { status, output } = await term.execSizeLimit(
      null,
      skipStep,
      buildScript
    );
    const { output: baseOutput } = await term.execSizeLimit(
      pr.base.ref,
      null,
      buildScript
    );

    let base;
    let current;

    try {
      base = limit.parseResults(baseOutput);
      current = limit.parseResults(output);
    } catch (error) {
      console.log(
        "Error parsing size-limit output. The output should be a json."
      );
      throw error;
    }

    const failed = status > 0;// ? "REQUEST_CHANGES" : "COMMENT";
    if (failed) {
      setFailed("Failed");
    }
    const body = [
      SIZE_LIMIT_HEADING,
      table(limit.formatResults(base, current))
    ].join("\r\n");

    const { data: commentList } = await octokit.issues.listComments({
      ...repo,
      issue_number: pr.number
    });

    const sizeLimitComment = commentList.find(comment =>
      comment.body.startsWith(SIZE_LIMIT_HEADING)
    );

    if (sizeLimitComment == undefined) {
      try {
        octokit.issues.createComment({
          ...repo,
          // eslint-disable-next-line camelcase
          issue_number: pr.number,
          body
        });
      } catch (error) {
        console.log(
          "Error creating comment. This can happen for PR's originating from a fork without write permissions."
        );
      }
    } else {
      try {
        octokit.issues.updateComment({
          ...repo,
          // eslint-disable-next-line camelcase
          comment_id: sizeLimitComment.id,
          body
        });
      } catch (error) {
        console.log(
          "Error updating comment. This can happen for PR's originating from a fork without write permissions."
        );
      }
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
