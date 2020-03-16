import { exec } from "@actions/exec";

class Git {
  async execSizeLimit(
    branch?: string
  ): Promise<{ status: number; output: string }> {
    let output = "";

    if (branch) {
      await exec(`git checkout -f ${branch}`);
    }

    await exec("npm install");
    await exec("npm run build");
    const status = await exec("npm run size -- --json", [], {
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

export default Git;
