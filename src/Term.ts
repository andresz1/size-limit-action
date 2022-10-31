import { exec } from "@actions/exec";
import hasYarn from "has-yarn";
import hasPNPM from "has-pnpm";

class Term {
  /**
   * Autodetects and gets the current package manager for the current directory, either yarn, pnpm,
   * or npm. Default is `npm`.
   *
   * @param directory The current directory
   * @returns The detected package manager in use, one of `yarn`, `pnpm`, `npm`
   */
  getPackageManager(directory?: string): string {
    return hasYarn(directory) ? "yarn" : hasPNPM(directory) ? "pnpm" : "npm";
  }

  async execSizeLimit(
    script: string,
    buildScript: string,
    skipInstall: boolean,
    skipBuild: boolean,
    windowsVerbatimArguments?: boolean,
    branch?: string,
    cleanScript?: string,
    directory?: string,
    packageManager?: string
  ): Promise<{ status: number; output: string }> {
    const manager = packageManager || this.getPackageManager(directory);
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
        cwd: directory,
      });
    }

    if (!skipBuild) {
      await exec(`${manager} run ${buildScript}`, [], {
        cwd: directory,
      });
    }

    const status = await exec(script, [], {
      windowsVerbatimArguments,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
      cwd: directory,
    });

    if (cleanScript) {
      await exec(`${manager} run ${cleanScript}`, [], {
        cwd: directory,
      });
    }

    return {
      status,
      output,
    };
  }
}

export default Term;
