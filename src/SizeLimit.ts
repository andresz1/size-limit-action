import { exec } from "@actions/exec";
import hasYarn from "has-yarn";
import SizeLimitParser, { Result } from "./SizeLimitParser";

const INSTALL_STEP = "install";
const BUILD_STEP = "build";

class SizeLimit {
  parser: SizeLimitParser;

  constructor(parser: SizeLimitParser) {
    this.parser = parser;
  }

  async exec(
    ref?: string,
    skipStep?: string,
    buildScript?: string
  ): Promise<{ status: number; results: { [name: string]: Result } }> {
    const manager = hasYarn() ? "yarn" : "npm";
    let output = "";

    if (ref) {
      try {
        await exec(`git fetch origin ${ref} --depth=1`);
      } catch (error) {
        console.log("Fetch failed", error.message);
      }

      await exec(`git checkout -f ${ref}`);
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

    const results = this.parser.parse(output);

    return {
      status,
      results
    };
  }
}

export default SizeLimit;
