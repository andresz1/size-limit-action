import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
// @ts-ignore
import table from "markdown-table";
import Term from "./Term";
import SizeLimit from "./SizeLimit";

const SIZE_LIMIT_HEADING = `## size-limit report 📦 `;

const heading = (commentKey: string) =>
  commentKey ? `${SIZE_LIMIT_HEADING}for ${commentKey} ` : SIZE_LIMIT_HEADING;

async function fetchPreviousComment(
  octokit: GitHub,
  repo: { owner: string; repo: string },
  pr: { number: number },
  commentKey: string
) {
  // TODO: replace with octokit.issues.listComments when upgraded to v17
  const commentList = await octokit.paginate(
    "GET /repos/:owner/:repo/issues/:issue_number/comments",
    {
      ...repo,
      // eslint-disable-next-line camelcase
      issue_number: pr.number
    }
  );

  const sizeLimitComment = commentList.find(comment =>
    comment.body.startsWith(heading(commentKey))
  );
  return !sizeLimitComment ? null : sizeLimitComment;
}

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
    const cleanScript = getInput("clean_script");
    const script = getInput("script");
    const packageManager = getInput("package_manager");
    const directory = getInput("directory") || process.cwd();
    const windowsVerbatimArguments =
      getInput("windows_verbatim_arguments") === "true" ? true : false;
    const commentKey = getInput("comment_key");
    const octokit = new GitHub(token);
    const term = new Term();
    const limit = new SizeLimit();

    const { status, output } = await term.execSizeLimit(
      null,
      skipStep,
      buildScript,
      cleanScript,
      windowsVerbatimArguments,
      directory,
      script,
      packageManager
    );
    const { output: baseOutput } = await term.execSizeLimit(
      pr.base.ref,
      null,
      buildScript,
      cleanScript,
      windowsVerbatimArguments,
      directory,
      script,
      packageManager
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

    const body = [
      heading(commentKey),
      table(limit.formatResults(base, current))
    ].join("\r\n");

    const sizeLimitComment = await fetchPreviousComment(
      octokit,
      repo,
      pr,
      commentKey
    );

    if (!sizeLimitComment) {
      try {
        await octokit.issues.createComment({
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
        await octokit.issues.updateComment({
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

    if (status > 0) {
      setFailed("Size limit has been exceeded.");
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
