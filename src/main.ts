import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import { exec } from "@actions/exec";
// @ts-ignore
import table from "markdown-table";
// @ts-ignore
import bytes from "bytes";

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

const formatBytes = (size: number): string => {
  return bytes.format(size, { unitSeparator: " " });
};

const formatTime = (seconds: number): string => {
  if (seconds >= 1) {
    return `${Math.ceil(seconds * 10) / 10} s`;
  }

  return `${Math.ceil(seconds * 1000)} ms`;
};

export async function getResults(branch?: string): Promise<Array<IResult>> {
  let output = "";

  if (branch) {
    await exec(`git checkout -f ${branch}`);
  }

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
    const total = result.loading + result.running;

    return [
      result.name,
      formatBytes(result.size),
      formatTime(result.loading),
      formatTime(result.running),
      formatTime(total)
    ];
  });

  return table([
    [
      "Path",
      "Size",
      "Loading time (3g)",
      "Running time (Snapdragon)",
      "Total time"
    ],
    ...values
  ]);
};

async function run() {
  try {
    const token = getInput("github_token");

    if (context.payload.pull_request == null) {
      setFailed("No pull request found.");
      return;
    }

    const current = await getResults();
    const base = await getResults(process.env.GITHUB_BASE_REF);

    const number = context.payload.pull_request.number;
    const octokit = new GitHub(token);

    octokit.issues.createComment({
      ...context.repo,
      // eslint-disable-next-line camelcase
      issue_number: number,
      body: [
        "### Base",
        getTable(base),
        "",
        "### Current",
        getTable(current)
      ].join("\r\n")
    });
  } catch (error) {
    setFailed(error.message);
  }
}

run();
