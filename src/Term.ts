import { exec } from "@actions/exec";
import hasYarn from "has-yarn";
import hasPNPM from "has-pnpm";

import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

function hasBun(cwd = process.cwd()) {
	return fs.existsSync(path.resolve(cwd, 'bun.lockb'));
}

const INSTALL_STEP = "install";
const BUILD_STEP = "build";

class Term {
  /**
   * Autodetects and gets the current package manager for the current directory, either yarn, pnpm, bun,
   * or npm. Default is `npm`.
   *
   * @param directory The current directory
   * @returns The detected package manager in use, one of `yarn`, `pnpm`, `npm`, `bun`
   */
  getPackageManager(directory?: string): string {
    return hasYarn(directory) ? "yarn" : hasPNPM(directory) ? "pnpm" : hasBun(directory) ? "bun" : "npm";
  }

  async execSizeLimit(
    branch?: string,
    skipStep?: string,
    buildScript?: string,
    cleanScript?: string,
    windowsVerbatimArguments?: boolean,
    directory?: string,
    script?: string,
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

    if (skipStep !== INSTALL_STEP && skipStep !== BUILD_STEP) {
      await exec(`${manager} install`, [], {
        cwd: directory
      });
    }

    if (skipStep !== BUILD_STEP) {
      const script = buildScript || "build";
      await exec(`${manager} run ${script}`, [], {
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
