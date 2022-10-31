import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils.js";
import { markdownTable } from "markdown-table";
import Term from "./Term";
import SizeLimit from "./SizeLimit";

const SIZE_LIMIT_HEADING = `## size-limit report 📦 `;

async function fetchPreviousComment(
  octokit: InstanceType<typeof GitHub>,
  repo: { owner: string; repo: string },
  pr: { number: number }
) {
  const { data: commentList } = await octokit.rest.issues.listComments({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: pr.number,
  });

  return commentList.find((comment) =>
    comment.body.startsWith(SIZE_LIMIT_HEADING)
  );
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
    const script = getInput("script");
    const buildScript = getInput("build_script");
    const skipInstall = getInput("skip_install") === "true";
    const skipBuild = getInput("skip_build") === "true";
    const cleanScript = getInput("clean_script");
    const directory = getInput("directory") || process.cwd();
    const windowsVerbatimArguments =
      getInput("windows_verbatim_arguments") === "true";
    const packageManager = getInput("package_manager");

    const octokit = getOctokit(token);
    const term = new Term();
    const limit = new SizeLimit();

    const { status, output } = await term.execSizeLimit(
      script,
      buildScript,
      skipInstall,
      skipBuild,
      windowsVerbatimArguments,
      null,
      cleanScript,
      directory,
      packageManager
    );
    const { output: baseOutput } = await term.execSizeLimit(
      script,
      buildScript,
      skipInstall,
      skipBuild,
      windowsVerbatimArguments,
      pr.base.ref,
      cleanScript,
      directory,
      packageManager
    );

    let base;
    let current;

    try {
      base = limit.parseResults(baseOutput);
    } catch (error) {
      console.log(
        "Error parsing size-limit output of base branch. The output should be a json."
      );
      throw error;
    }

    try {
      current = limit.parseResults(output);
    } catch (error) {
      console.log(
        "Error parsing size-limit output of current branch. The output should be a json."
      );
      throw error;
    }

    const body = [
      SIZE_LIMIT_HEADING,
      markdownTable(limit.formatResults(base, current)),
    ].join("\r\n");

    const sizeLimitComment = await fetchPreviousComment(octokit, repo, pr);

    if (!sizeLimitComment) {
      try {
        await octokit.rest.issues.createComment({
          ...repo,
          issue_number: pr.number,
          body,
        });
      } catch (error) {
        console.log(
          "Error creating comment. This can happen for PR's originating from a fork without write permissions."
        );
      }
    } else {
      try {
        await octokit.rest.issues.updateComment({
          ...repo,
          // eslint-disable-next-line camelcase
          comment_id: sizeLimitComment.id,
          body,
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
