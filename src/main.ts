import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import { exec } from "@actions/exec";
// @ts-ignore
import table from "markdown-table";

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

const getTable = (results: Array<IResult>): string => {
  const values = results.map((result: IResult) => {
    return [result.name, result.size, result.running, result.loading];
  });

  return table([["Name", "Size", "Loading time", "Running time"], ...values]);
};

async function run() {
  try {
    const token = getInput("github_token");

    if (context.payload.pull_request == null) {
      setFailed("No pull request found.");
      return;
    }

    const results = await test();
    const body = getTable(results);

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
