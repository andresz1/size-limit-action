import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
// @ts-ignore
import table from "markdown-table";
// @ts-ignore
import { tail } from "lodash";
import Term from "./Term";
import SizeLimit from "./SizeLimit";

const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";

async function run() {
  try {
    if (context.payload.pull_request === null) {
      throw new Error(
        "No PR found. Only pull_request workflows are supported."
      );
    }

    tail([1, 2]);

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
      process.env.GITHUB_BASE_REF,
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

    const number = context.payload.pull_request.number;
    const event = status > 0 ? "REQUEST_CHANGES" : "COMMENT";
    const body = [
      `## [size-limit](${SIZE_LIMIT_URL}) report`,
      table(limit.formatResults(base, current))
    ].join("\r\n");

    try {
      octokit.pulls.createReview({
        ...context.repo,
        // eslint-disable-next-line camelcase
        pull_number: number,
        event,
        body
      });
    } catch (error) {
      console.log(
        "Error creating PR review. This can happen for PR's originating from a fork without write permissions."
      );
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
