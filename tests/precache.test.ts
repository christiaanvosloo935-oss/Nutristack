import { describe, expect, test } from "vitest";
import { injectPrecache } from "../build/precache";

const SW = 'const CACHE = "nutristack-__VERSION__";\nconst PRECACHE = "__PRECACHE__";\n';

describe("injectPrecache", () => {
  test("lists the page and every built file, with no placeholders left", () => {
    const out = injectPrecache(SW, ["/assets/index-abc.js", "/icon-192.png"]);
    expect(out).toContain('"/"');
    expect(out).toContain('"/assets/index-abc.js"');
    expect(out).toContain('"/icon-192.png"');
    expect(out).not.toContain("__PRECACHE__");
    expect(out).not.toContain("__VERSION__");
  });

  test("the cache name changes when the files change and is stable otherwise", () => {
    const a = injectPrecache(SW, ["/assets/a.js", "/b.png"]);
    const sameDifferentOrder = injectPrecache(SW, ["/b.png", "/assets/a.js"]);
    const changed = injectPrecache(SW, ["/assets/c.js", "/b.png"]);
    expect(a).toBe(sameDifferentOrder);
    expect(a).not.toBe(changed);
  });
});
