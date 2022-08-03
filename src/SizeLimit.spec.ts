import SizeLimit from "./SizeLimit";

describe("SizeLimit", () => {
  test("should parse size-limit output", () => {
    const limit = new SizeLimit();
    const output = JSON.stringify([
      {
        name: "dist/index.js",
        passed: true,
        size: "110894",
        sizeLimit: "120000",
        running: "0.10210999999999999",
        loading: "2.1658984375"
      }
    ]);

    expect(limit.parseResults(output)).toEqual({
      "dist/index.js": {
        name: "dist/index.js",
        loading: 2.1658984375,
        running: 0.10210999999999999,
        size: 110894,
        sizeLimit: 120000,
        total: 2.2680084375000003
      }
    });
  });

  test("should parse size-limit without times output", () => {
    const limit = new SizeLimit();
    const output = JSON.stringify([
      {
        name: "dist/index.js",
        passed: true,
        size: "110894",
        sizeLimit: 120000
      }
    ]);

    expect(limit.parseResults(output)).toEqual({
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,
        sizeLimit: 120000
      }
    });
  });

  test("should format size-limit results", () => {
    const limit = new SizeLimit();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,
        sizeLimit: 120000,
        running: 0.10210999999999999,
        loading: 2.1658984375,
        total: 2.2680084375000003
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894,
        sizeLimit: 120000,
        running: 0.20210999999999999,
        loading: 2.5658984375,
        total: 2.7680084375000003
      }
    };

    expect(limit.formatResults(base, current)).toEqual([
      SizeLimit.TIME_RESULTS_HEADER,
      [
        "dist/index.js",
        "98.53 KB (-9.02% 🔽)",
        "2.6 s (+18.47% 🔺)",
        "203 ms (+97.94% 🔺)",
        "2.8 s"
      ]
    ]);
  });

  test("should format size-limit without times results", () => {
    const limit = new SizeLimit();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,
        sizeLimit: 120000
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894,
        sizeLimit: 120000
      }
    };

    expect(limit.formatResults(base, current)).toEqual([
      SizeLimit.SIZE_RESULTS_HEADER,
      ["dist/index.js", "98.53 KB (-9.02% 🔽)"]
    ]);
  });

  test("should format size-limit with new section", () => {
    const limit = new SizeLimit();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,
        sizeLimit: 120000
      }
    };
    const current = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 100894,
        sizeLimit: 120000
      },
      "dist/new.js": {
        name: "dist/new.js",
        size: 100894,
        sizeLimit: 120000
      }
    };

    expect(limit.formatResults(base, current)).toEqual([
      SizeLimit.SIZE_RESULTS_HEADER,
      ["dist/index.js", "98.53 KB (-9.02% 🔽)"],
      ["dist/new.js", "98.53 KB (+100% 🔺)"]
    ]);
  });

  test("should format size-limit with deleted section", () => {
    const limit = new SizeLimit();
    const base = {
      "dist/index.js": {
        name: "dist/index.js",
        size: 110894,

        sizeLimit: 120000
      }
    };
    const current = {
      "dist/new.js": {
        name: "dist/new.js",
        size: 100894,
        sizeLimit: 120000
      }
    };

    expect(limit.formatResults(base, current)).toEqual([
      SizeLimit.SIZE_RESULTS_HEADER,
      ["dist/index.js", "0 B (-100% 🔽)"],
      ["dist/new.js", "98.53 KB (+100% 🔺)"]
    ]);
  });
});
