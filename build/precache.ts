import { createHash } from "node:crypto";

/** Fill the service worker's precache list and cache version (derived from the file list). */
export function injectPrecache(source: string, files: string[]): string {
  const list = ["/", ...[...files].sort()];
  const version = createHash("sha1").update(list.join("\n")).digest("hex").slice(0, 10);
  return source.replace('"__PRECACHE__"', JSON.stringify(list)).replace("__VERSION__", version);
}
