import { GitHub, context } from "@actions/github";
import { getInput, setFailed } from "@actions/core";

import SizeLimit from "./SizeLimit";
import Term from "./Term";
// @ts-ignore
import table from "markdown-table";

const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";
const SIZE_LIMIT_HEADING = `## [size-limit](${SIZE_LIMIT_URL}) report`;

async function run() {
  try {
    if (context.payload.pull_request === null) {
      throw new Error(
        "No PR found. Only pull_request workflows are supported."
      );
    }

    const token = getInput("github_token");
    const ignoreIdentical = getInput("ignore_identical");
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
      SIZE_LIMIT_HEADING,
      table(limit.formatResults(base, current))
    ].join("\r\n");

    if (ignoreIdentical) {
      try {
        const { data: reviews } = await octokit.pulls.listReviews({
          ...context.repo,
          // eslint-disable-next-line camelcase
          pull_number: number
        });

        const sizeLimitReviews = reviews.filter(review =>
          review.body.startsWith(SIZE_LIMIT_HEADING)
        );
        // only look at the last review (it could return to a previous state which we would want to know about)
        if (
          sizeLimitReviews.length > 0 &&
          sizeLimitReviews[sizeLimitReviews.length - 1].body === body
        ) {
          // The last review was the same, so we shouldn't repeat
          return;
        }
      } catch (error) {
        console.log("Failed to compare against previous reviews");
      }
    }

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
