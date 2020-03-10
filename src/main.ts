import { join } from "path";
import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
// @ts-ignore
import sizeLimit from "size-limit";
// @ts-ignore
import filePlugin from "@size-limit/file";
// @ts-ignore
import timePlugin from "@size-limit/time";

async function run() {
  try {
    const message = "message";
    const token = getInput("github_token");

    if (context.payload.pull_request == null) {
      setFailed("No pull request found.");
      return;
    }
    console.log(process.cwd());
    const x = join(process.cwd(), "dist/index.js");
    const data = await sizeLimit([filePlugin, timePlugin], [x]);
    console.log(data);

    const number = context.payload.pull_request.number;
    const octokit = new GitHub(token);

    octokit.issues.createComment({
      ...context.repo,
      // eslint-disable-next-line camelcase
      issue_number: number,
      body: message
    });
  } catch (error) {
    setFailed(error.message);
  }
}

run();
