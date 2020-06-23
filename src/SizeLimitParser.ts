// @ts-ignore
import bytes from "bytes";

export interface Result {
  name: string;
  size: number;
  running?: number;
  loading?: number;
  total?: number;
}

class SizeLimitParser {
  static SIZE_RESULTS_HEADER = ["Path", "Size"];

  static TIME_RESULTS_HEADER = [
    "Path",
    "Size",
    "Loading time (3g)",
    "Running time (snapdragon)",
    "Total time"
  ];

  private formatBytes(size: number): string {
    return bytes.format(size, { unitSeparator: " " });
  }

  private formatTime(seconds: number): string {
    if (seconds >= 1) {
      return `${Math.ceil(seconds * 10) / 10} s`;
    }

    return `${Math.ceil(seconds * 1000)} ms`;
  }

  private formatChange(base: number = 0, current: number = 0): string {
    if (current === 0) {
      return "-100%";
    }

    const value = ((current - base) / current) * 100;
    const formatted =
      (Math.sign(value) * Math.ceil(Math.abs(value) * 100)) / 100;

    if (value > 0) {
      return `+${formatted}% 🔺`;
    }

    if (value === 0) {
      return `${formatted}%`;
    }

    return `${formatted}% 🔽`;
  }

  private formatLine(value: string, change: string) {
    return `${value} (${change})`;
  }

  private formatSizeResult(
    name: string,
    base: Result,
    current: Result
  ): Array<string> {
    return [
      name,
      this.formatLine(
        this.formatBytes(current.size),
        this.formatChange(base.size, current.size)
      )
    ];
  }

  private formatTimeResult(
    name: string,
    base: Result,
    current: Result
  ): Array<string> {
    return [
      name,
      this.formatLine(
        this.formatBytes(current.size),
        this.formatChange(base.size, current.size)
      ),
      this.formatLine(
        this.formatTime(current.loading),
        this.formatChange(base.loading, current.loading)
      ),
      this.formatLine(
        this.formatTime(current.running),
        this.formatChange(base.running, current.running)
      ),
      this.formatTime(current.total)
    ];
  }

  parse(output: string): { [name: string]: Result } {
    const results = JSON.parse(output);

    return results.reduce(
      (current: { [name: string]: Result }, result: any) => {
        let time = {};

        if (result.loading !== undefined && result.running !== undefined) {
          const loading = +result.loading;
          const running = +result.running;

          time = {
            running,
            loading,
            total: loading + running
          };
        }

        return {
          ...current,
          [result.name]: {
            name: result.name,
            size: +result.size,
            ...time
          }
        };
      },
      {}
    );
  }

  diff(
    base: { [name: string]: Result },
    current: { [name: string]: Result }
  ): Array<Array<string>> {
    const empty = {
      name: "-",
      size: 0,
      running: 0,
      loading: 0,
      total: 0
    };
    const names = [...new Set([...Object.keys(base), ...Object.keys(current)])];
    const isSize = names.some(
      (name: string) => current[name] && current[name].total === undefined
    );
    const header = isSize
      ? SizeLimitParser.SIZE_RESULTS_HEADER
      : SizeLimitParser.TIME_RESULTS_HEADER;

    const fields = names.map((name: string) => {
      const baseResult = base[name] || empty;
      const currentResult = current[name] || empty;

      if (isSize) {
        return this.formatSizeResult(name, baseResult, currentResult);
      }
      return this.formatTimeResult(name, baseResult, currentResult);
    });

    return [header, ...fields];
  }
}
export default SizeLimitParser;
