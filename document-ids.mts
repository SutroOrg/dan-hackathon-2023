import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function loadIds(filename: string): Set<string> {
  try {
    if (existsSync(filename)) {
      const contents = readFileSync(filename, "utf-8");
      return new Set(JSON.parse(contents));
    }
  } catch (e) {
    return new Set();
  }

  return new Set();
}

export function saveIds(filename: string, ids: Set<string>): void {
  writeFileSync(filename, JSON.stringify(Array.from(ids)));
}
