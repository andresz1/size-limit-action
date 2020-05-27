import { exec } from "@actions/exec";
import hasYarn from "has-yarn";

const INSTALL_STEP = "install";
const BUILD_STEP = "build";

class Term {
  async execSizeLimit(
    branch?: string,
    skipStep?: string,
    buildScript?: string
  ): Promise<{ status: number; output: string }> {
    const manager = hasYarn() ? "yarn" : "npm";
    let output = "";

    if (branch) {
      await exec(`git fetch origin ${branch} --depth=1`);
      await exec(`git checkout -f ${branch}`);
    }

    if (skipStep !== INSTALL_STEP && skipStep !== BUILD_STEP) {
      await exec(`${manager} install`);
    }

    if (skipStep !== BUILD_STEP) {
      const script = buildScript || "build";
      await exec(`${manager} run ${script}`);
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
