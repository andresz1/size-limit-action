import SizeLimitParser from "../src/SizeLimitParser";

describe("SizeLimit", () => {
  test("should parse size-limit output", () => {
    const parser = new SizeLimitParser();
    const output = JSON.stringify([
      {
        name: "dist/index.js",
        passed: true,
        size: "110894",
        running: "0.10210999999999999",
        loading: "2.1658984375"
      }
    ]);

    expect(parser.parse(output)).toEqual({
      "dist/index.js": {
        name: "dist/index.js",
        loading: 2.1658984375,
        running: 0.10210999999999999,
        size: 110894,
        total: 2.2680084375000003
      }
    });
  });

  test("should parse size-limit without times output", () => {
    const parser = new SizeLimitParser();
    const output = JSON.stringify([
      {
        name: "dist/index.js",
        passed: true,
        size: "110894"
      }
    ]);

    expect(parser.parse(output)).toEqual({
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894
      }
    });
  });

  test("should format size-limit results", () => {
    const parser = new SizeLimitParser();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,
        running: 0.10210999999999999,
        loading: 2.1658984375,
        total: 2.2680084375000003
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894,
        running: 0.20210999999999999,
        loading: 2.5658984375,
        total: 2.7680084375000003
      }
    };

    expect(parser.diff(base, current)).toEqual([
      SizeLimitParser.TIME_RESULTS_HEADER,
      [
        "dist/index.js",
        "98.53 KB (-9.92% 🔽)",
        "2.6 s (+15.59% 🔺)",
        "203 ms (+49.48% 🔺)",
        "2.8 s"
      ]
    ]);
  });

  test("should format size-limit without times results", () => {
    const parser = new SizeLimitParser();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894
      }
    };

    expect(parser.diff(base, current)).toEqual([
      SizeLimitParser.SIZE_RESULTS_HEADER,
      ["dist/index.js", "98.53 KB (-9.92% 🔽)"]
    ]);
  });

  test("should format size-limit with new section", () => {
    const parser = new SizeLimitParser();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894
      },
      "dist/new.js": {
        name: "dist/new.js",
        size: 100894
      }
    };

    expect(parser.diff(base, current)).toEqual([
      SizeLimitParser.SIZE_RESULTS_HEADER,
      ["dist/index.js", "98.53 KB (-9.92% 🔽)"],
      ["dist/new.js", "98.53 KB (+100% 🔺)"]
    ]);
  });

  test("should format size-limit with deleted section", () => {
    const parser = new SizeLimitParser();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894
      }
    };
    const current = {
      "dist/new.js": {
        name: "dist/new.js",
        size: 100894
      }
    };

    expect(parser.diff(base, current)).toEqual([
      SizeLimitParser.SIZE_RESULTS_HEADER,
      ["dist/index.js", "0 B (-100%)"],
      ["dist/new.js", "98.53 KB (+100% 🔺)"]
    ]);
  });
});
