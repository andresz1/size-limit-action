import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import { exec } from "@actions/exec";
// @ts-ignore
import table from "markdown-table";

const SIZE_LIMIT_RESULTS = {
  size: "Size",
  loading: "Loading time",
  running: "Running time",
  total: "Total time"
};

interface IResult {
  name: string;
  size: number;
  running: number;
  loading: number;
}

const parseResult = (str: string): Array<IResult> => {
  const results = JSON.parse(str);

  return results.map((result: any) => {
    return {
      name: result.name,
      size: +result.size,
      running: +result.running,
      loading: +result.loading
    };
  });
};

export async function test(): Promise<Array<IResult>> {
  let output = "";

  await exec(`npm install`);
  await exec(`npm run build`);
  await exec(`npx size-limit --json`, [], {
    windowsVerbatimArguments: true,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      }
    }
  });

  return parseResult(output);
}

async function run() {
  try {
    const token = getInput("github_token");

    if (context.payload.pull_request == null) {
      setFailed("No pull request found.");
      return;
    }

    const [result] = await test();
    const body = table([
      ["Name", result.name],
      ["Size", result.size],
      ["Loading time", result.loading],
      ["Running time", result.running]
    ]);

    const number = context.payload.pull_request.number;
    const octokit = new GitHub(token);

    octokit.issues.createComment({
      ...context.repo,
      // eslint-disable-next-line camelcase
      issue_number: number,
      body
    });
  } catch (error) {
    setFailed(error.message);
  }
}

run();
