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

interface IResults {
  [name: string]: IResult;
}

const formatBytes = (size: number): string => {
  return bytes.format(size, { unitSeparator: " " });
};

const formatTime = (seconds: number): string => {
  if (seconds >= 1) {
    return `${Math.ceil(seconds * 10) / 10} s`;
  }

  return `${Math.ceil(seconds * 1000)} ms`;
};

const parseResults = (str: string): IResults => {
  const results = JSON.parse(str);

  return results.reduce((current: IResults, result: any) => {
    return {
      ...current,
      [result.name]: {
        name: result.name,
        size: +result.size,
        running: +result.running,
        loading: +result.loading
      }
    };
  }, {});
};

const getResults = async (
  branch?: string
): Promise<{ status: number; results: IResults }> => {
  let output = "";

  if (branch) {
    await exec(`git checkout -f ${branch}`);
  }

  await exec(`npm install`);
  await exec(`npm run build`);
  const status = await exec(`npx size-limit --json`, [], {
    windowsVerbatimArguments: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      }
    }
  });

  return {
    status,
    results: parseResults(output)
  };
};

const formatChange = (base: number = 0, current: number = 0) => {
  if (current === 0) {
    return "-100%";
  }

  const value = ((current - base) / current) * 100;
  const formatted = (Math.sign(value) * Math.ceil(Math.abs(value) * 100)) / 100;

  if (value > 0) {
    return `+${formatted}% 🔺`;
  }

  if (value === 0) {
    return `${formatted}%`;
  }

  return `${formatted}% 🔽`;
};

const getTable = (baseResults: IResults, currentResults: IResults): string => {
  const keys = [
    ...new Set([...Object.keys(baseResults), ...Object.keys(currentResults)])
  ];

  const values = keys.map((key: string) => {
    const base = baseResults[key];
    const current = currentResults[key];
    const total = current.loading + current.running;

    return [
      key,
      `${formatBytes(current.size)} (${formatChange(base.size, current.size)})`,
      `${formatTime(current.loading)} (${formatChange(
        base.loading,
        current.loading
      )})`,
      `${formatTime(current.running)} (${formatChange(
        base.running,
        current.running
      )})`,
      formatTime(total)
    ];
  });

  return table([
    [
      "Path",
      "Size",
      "Loading time (3g)",
      "Running time (snapdragon)",
      "Total time"
    ],
    ...values
  ]);
};

async function run() {
  try {
    const token = getInput("github_token");

    if (context.payload.pull_request === null) {
      setFailed("No pull request found.");
      return;
    }

    const { status, results: current } = await getResults();
    const { results: base } = await getResults(process.env.GITHUB_BASE_REF);

    const number = context.payload.pull_request.number;
    const octokit = new GitHub(token);

    octokit.pulls.createReview({
      ...context.repo,
      // eslint-disable-next-line camelcase
      pull_number: number,
      event: status > 0 ? "REQUEST_CHANGES" : "COMMENT",
      body: [
        "## [size-limit](https://github.com/ai/size-limit) report",
        `*Status:* ${
          status > 0 ? "Total time limit 🔴" : "Total time limit ✅"
        }`,
        getTable(base, current)
      ].join("\r\n")
    });
  } catch (error) {
    setFailed(error.message);
  }
}

run();
