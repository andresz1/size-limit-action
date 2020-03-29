import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
// @ts-ignore
import table from "markdown-table";
import Term from "./Term";
import SizeLimit from "./SizeLimit";

const TABLE_HEADER = [
  "Path",
  "Size",
  "Loading time (3g)",
  "Running time (snapdragon)",
  "Total time"
];
const SIZE_LIMIT_URL = "https://github.com/ai/size-limit";

async function run() {
  try {
    if (context.payload.pull_request === null) {
      return setFailed("No pull request found.");
    }

    const token = getInput("github_token");
    const skipStep = getInput("skip_step");
    const octokit = new GitHub(token);
    const term = new Term();
    const limit = new SizeLimit();

    const { status, output } = await term.execSizeLimit(null, skipStep);
    const { output: baseOutput } = await term.execSizeLimit(
      process.env.GITHUB_BASE_REF
    );
    const base = limit.parseResults(baseOutput);
    const current = limit.parseResults(output);

    const number = context.payload.pull_request.number;
    const event = status > 0 ? "REQUEST_CHANGES" : "COMMENT";
    const body = [
      `## [size-limit](${SIZE_LIMIT_URL}) report`,
      table([TABLE_HEADER, ...limit.formatResults(base, current)])
    ].join("\r\n");

    octokit.pulls.createReview({
      ...context.repo,
      // eslint-disable-next-line camelcase
      pull_number: number,
      event,
      body
    });
  } catch (error) {
    setFailed(error.message);
  }
}

run();
