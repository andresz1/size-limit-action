import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import SizeLimit from "./SizeLimit";
import SizeLimitParser from "./SizeLimitParser";
import SizeLimitReporter from "./SizeLimitReporter";

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
    const parser = new SizeLimitParser();
    const limit = new SizeLimit(parser);
    const reporter = new SizeLimitReporter(octokit);

    const { status, results } = await limit.exec(null, skipStep, buildScript);
    const { results: baseResults } = await limit.exec(
      pr.base.ref,
      null,
      buildScript
    );
    const isInvalid = status > 0;
    const diffResults = parser.diff(baseResults, results);

    try {
      await reporter.comment(repo, pr.number, isInvalid, diffResults);
    } catch (error) {
      console.log(
        "Error posting comment. This can happen for PR's originating from a fork without write permissions."
      );
    }

    if (isInvalid) {
      throw new Error("Size limit has been exceeded.");
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
