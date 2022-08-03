import { exec } from "@actions/exec";
import hasYarn from "has-yarn";
import hasPNPM from "has-pnpm";

const INSTALL_STEP = "install";
const BUILD_STEP = "build";
const ALL_STEPS = "all";

class Term {
  async execSizeLimit(
    script: string,
    buildScript: string,
    skipInstall: boolean,
    skipBuild: boolean,
    windowsVerbatimArguments: boolean,
    branch?: string,
    cleanScript?: string,
    directory?: string
  ): Promise<{ status: number; output: string }> {
    const manager = hasYarn(directory)
      ? "yarn"
      : hasPNPM(directory)
      ? "pnpm"
      : "npm";
    let output = "";

    if (branch) {
      try {
        await exec(`git fetch origin ${branch} --depth=1`);
      } catch (error) {
        console.log("Fetch failed", error.message);
      }

      await exec(`git checkout -f ${branch}`);
    }

    if (!skipInstall) {
      await exec(`${manager} install`, [], {
        cwd: directory
      });
    }

    if (!skipBuild) {
      await exec(`${manager} run ${buildScript}`, [], {
        cwd: directory
      });
    }

    const status = await exec(script, [], {
      windowsVerbatimArguments,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        }
      },
      cwd: directory
    });

    if (cleanScript) {
      await exec(`${manager} run ${cleanScript}`, [], {
        cwd: directory
      });
    }

    return {
      status,
      output
    };
  }
}

export default Term;
