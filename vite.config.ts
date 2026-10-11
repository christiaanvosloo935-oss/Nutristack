import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import { injectPrecache } from "./build/precache";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/** After the build, make the service worker precache every built file so the app opens offline. */
function precachePlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "nutristack-precache",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, "sw.js");
      const files = listFiles(outDir)
        .map((f) => "/" + relative(outDir, f).split("\\").join("/"))
        .filter((f) => f !== "/sw.js" && f !== "/index.html");
      writeFileSync(swPath, injectPrecache(readFileSync(swPath, "utf8"), files));
    },
  };
}

export default defineConfig({
  plugins: [precachePlugin()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
