// @ts-ignore
import bytes from "bytes";

interface IResult {
  name: string;
  size: number;
  running: number;
  loading: number;
  total: number;
}

class SizeLimit {
  parseResults(output: string): { [name: string]: IResult } {
    const results = JSON.parse(output);

    return results.reduce(
      (current: { [name: string]: IResult }, result: any) => {
        const total = result.running + result.loading;

        return {
          ...current,
          [result.name]: {
            name: result.name,
            size: +result.size,
            running: +result.running,
            loading: +result.loading,
            total
          }
        };
      },
      {}
    );
  }

  formatBytes(size: number): string {
    return bytes.format(size, { unitSeparator: " " });
  }

  formatTime(seconds: number): string {
    if (seconds >= 1) {
      return `${Math.ceil(seconds * 10) / 10} s`;
    }

    return `${Math.ceil(seconds * 1000)} ms`;
  }

  formatChange(base: number = 0, current: number = 0): string {
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

  formatLine(value: string, change: string) {
    return `${value} (${change})`;
  }

  formatResult(name: string, base: IResult, current: IResult): Array<string> {
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

  formatResults(
    base: { [name: string]: IResult },
    current: { [name: string]: IResult }
  ): Array<Array<string>> {
    const names = [...new Set([...Object.keys(base), ...Object.keys(current)])];

    return names.map((name: string) =>
      this.formatResult(name, base[name], current[name])
    );
  }
}
export default SizeLimit;
