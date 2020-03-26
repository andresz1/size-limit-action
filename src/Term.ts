import { exec } from "@actions/exec";
import hasYarn from "has-yarn";

const INSTALL_STEP = "install";
const BUILD_STEP = "build";

class Term {
  async execSizeLimit(
    branch?: string,
    skipStep?: string
  ): Promise<{ status: number; output: string }> {
    let output = "";

    if (branch) {
      await exec(`git checkout -f ${branch}`);
    }

    if (skipStep !== INSTALL_STEP && skipStep !== BUILD_STEP) {
      try {
        await exec("npm run size-install");
      } catch (error) {
        const manager = hasYarn() ? "yarn" : "npm";
        await exec(`${manager} install`);
      }
    }

    if (skipStep !== BUILD_STEP) {
      await exec("npm run size-build");
    }

    const status = await exec("npx size-limit --json", [], {
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
      output
    };
  }
}

export default Term;
