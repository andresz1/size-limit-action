import path from "path";
import { promises as fs } from "fs";

import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import * as artifact from "@actions/artifact";
import * as glob from "@actions/glob";

// @ts-ignore
import table from "markdown-table";

import Term from "./Term";
import SizeLimit from "./SizeLimit";
import download from "github-fetch-workflow-artifact";

const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";
const SIZE_LIMIT_HEADING = `## [size-limit](${SIZE_LIMIT_URL}) report`;
const ARTIFACT_NAME = "size-limit-action";
const RESULTS_FILE = "size-limit-results.json";

async function fetchPreviousComment(
  octokit: ReturnType<typeof getOctokit>,
  repo: { owner: string; repo: string },
  pr: { number: number }
) {
  const { data: commentList } = await octokit.issues.listComments({
    ...repo,
    // eslint-disable-next-line camelcase
    issue_number: pr.number
  });

  const sizeLimitComment = commentList.find(comment =>
    comment.body.startsWith(SIZE_LIMIT_HEADING)
  );
  return !sizeLimitComment ? null : sizeLimitComment;
}

async function run() {
  try {
    const { payload, repo } = context;
    const pr = payload.pull_request;
    const mainBranch = getInput("main_branch");
    const isMainBranch = context.ref.includes(mainBranch);

    if (!isMainBranch && !pr) {
      throw new Error(
        "No PR found. Only pull_request workflows are supported."
      );
    }

    const skipStep = getInput("skip_step");
    const buildScript = getInput("build_script");
    const githubToken = getInput("github_token");
    const octokit = getOctokit(githubToken);
    const term = new Term();
    const limit = new SizeLimit();
    const artifactClient = artifact.create();
    const resultsFilePath = path.resolve(__dirname, RESULTS_FILE);

    if (isMainBranch) {
      let base;
      const { output: baseOutput } = await term.execSizeLimit(
        null,
        buildScript,
      );

      try {
        base = limit.parseResults(baseOutput);
      } catch (error) {
        console.log(
          "Error parsing size-limit output. The output should be a json."
        );
        throw error;
      }

      try {
        await fs.writeFile(resultsFilePath, JSON.stringify(base), "utf8");
      } catch (err) {
        console.error(err);
      }
      const globber = await glob.create(resultsFilePath, {
        followSymbolicLinks: false
      });
      const files = await globber.glob();

      await artifactClient.uploadArtifact(ARTIFACT_NAME, files, __dirname);

      return;
    }

    let base;
    let current;

    try {
      // Ignore failures here as it is likely that this only happens when introducing size-limit
      // and this has not been run on the main branch yet
      await download(octokit, {
        ...repo,
        artifactName: ARTIFACT_NAME,
        branch: mainBranch,
        downloadPath: __dirname,

        // eslint-disable-next-line camelcase
        workflow_id: `${process.env.GITHUB_WORKFLOW}.yml`
      });
      base = JSON.parse(
        await fs.readFile(resultsFilePath, { encoding: "utf8" })
      );
    } catch (error) {
      console.log("Warning, unable to find base results");
      console.log(error);
    }

    const { status, output } = await term.execSizeLimit(
      skipStep,
      buildScript,
    );
    try {
      current = limit.parseResults(output);
    } catch (error) {
      console.log(
        "Error parsing size-limit output. The output should be a json."
      );
      throw error;
    }

    const body = [
      SIZE_LIMIT_HEADING,
      table(limit.formatResults(base, current))
    ].join("\r\n");

    // @ts-ignore
    const sizeLimitComment = await fetchPreviousComment(octokit, repo, pr);

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
    console.error(error);
    setFailed(error.message);
  }
}

run();
