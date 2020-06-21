import { GitHub, context } from "@actions/github";
import { getInput, setFailed } from "@actions/core";

import { Octokit } from "@octokit/rest";
import SizeLimit from "./SizeLimit";
import Term from "./Term";
// @ts-ignore
import table from "markdown-table";

const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";
const SIZE_LIMIT_HEADING = `## [size-limit](${SIZE_LIMIT_URL}) report`;

const stateToEventMapping: { [key: string]: any } = {
  COMMENTED: "COMMENT",
  CHANGES_REQUESTED: "REQUEST_CHANGES"
};

async function fetchPreviousReview(
  octokit: GitHub,
  repo: { owner: string; repo: string },
  pr: { number: number }
) {
  const reviews: Octokit.PullsListReviewsResponse = await octokit.paginate(
    // TODO: replace with octokit.pulls.listReviews when upgraded to v17
    "GET /repos/:owner/:repo/pulls/:pull_number/reviews",
    {
      ...repo,
      // eslint-disable-next-line camelcase
      pull_number: pr.number
    }
  );

  const sizeLimitReviews = reviews.filter(review =>
    review.body.startsWith(SIZE_LIMIT_HEADING)
  );
  return sizeLimitReviews.length > 0
    ? sizeLimitReviews[sizeLimitReviews.length - 1]
    : null;
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
    const updateReview = getInput("updateReview");
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

    const event = status > 0 ? "REQUEST_CHANGES" : "COMMENT";
    const body = [
      SIZE_LIMIT_HEADING,
      table(limit.formatResults(base, current))
    ].join("\r\n");

    let previousReview: Octokit.PullsListReviewsResponseItem | null = null;
    let isReviewStateChanged = true;
    try {
      previousReview = await fetchPreviousReview(octokit, repo, pr);
      isReviewStateChanged =
        !previousReview || stateToEventMapping[previousReview.state] !== event;

      if (!isReviewStateChanged && previousReview.body === body) {
        // The last review was the exact same, so we shouldn't repeat
        return;
      }
    } catch (error) {
      console.log("Failed to compare against previous reviews");
    }

    try {
      if (updateReview && !isReviewStateChanged) {
        await octokit.pulls.updateReview({
          ...repo,
          // eslint-disable-next-line camelcase
          pull_number: pr.number,
          // eslint-disable-next-line camelcase
          review_id: previousReview.id,
          body
        });
      } else {
        await octokit.pulls.createReview({
          ...repo,
          // eslint-disable-next-line camelcase
          pull_number: pr.number,
          event,
          body
        });
      }
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
