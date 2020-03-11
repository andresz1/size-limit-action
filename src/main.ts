import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import { exec } from "@actions/exec";
// @ts-ignore
import table from "markdown-table";

const SIZE_LIMIT_RESULTS = {
  size: "Size",
  loading: "Loading Time",
  running: "Running time",
  total: "Total time"
};

interface IResult {
  size: string;
  loading: string;
  running: string;
  total: string;
}

const getResult = (values: Array<string>, value: string): string => {
  const index = values.indexOf(`${value}:`);
  return values[index + 1];
};

const getResults = (data: string) => {
  const values = data.replace(/ +/g, " ").split(" ");

  return {
    size: getResult(values, SIZE_LIMIT_RESULTS.size),
    loading: getResult(values, SIZE_LIMIT_RESULTS.loading),
    running: getResult(values, SIZE_LIMIT_RESULTS.running),
    total: getResult(values, SIZE_LIMIT_RESULTS.total)
  };
};

export async function test(): Promise<IResult> {
  let output = "";

  await exec(`npm install`);
  await exec(`npm run build`);
  await exec(`npm run size`, [], {
    windowsVerbatimArguments: true,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      }
    }
  });

  return getResults(output);
}

async function run() {
  try {
    const token = getInput("github_token");

    if (context.payload.pull_request == null) {
      setFailed("No pull request found.");
      return;
    }

    const result = await test();
    const body = table([
      ["Size", result.size],
      ["Loading time", result.loading],
      ["Running time", result.running],
      ["Total time", result.total]
    ]);

    console.log(result);

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
