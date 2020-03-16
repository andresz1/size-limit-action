import SizeLimit from "./SizeLimit";

describe("SizeLimit", () => {
  test("should parse size-limit output properly", () => {
    const limit = new SizeLimit();
    const output = JSON.stringify([
      {
        name: "dist/index.js",
        passed: true,
        size: 110894,
        running: 0.10210999999999999,
        loading: 2.1658984375
      }
    ]);

    expect(limit.parseResults(output)).toEqual({
      "dist/index.js": {
        loading: 2.1658984375,
        name: "dist/index.js",
        running: 0.10210999999999999,
        size: 110894,
        total: 2.2680084375000003
      }
    });
  });

  test("should format size-limit results properly", () => {
    const limit = new SizeLimit();
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

    expect(limit.formatResults(base, current)).toEqual([
      [
        "dist/index.js",
        "98.53 KB (-9.92% 🔽)",
        "2.6 s (+15.59% 🔺)",
        "203 ms (+49.48% 🔺)",
        "2.8 s"
      ]
    ]);
  });
});
