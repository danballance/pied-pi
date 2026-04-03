import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import type { HarnessConfig } from "./types";

export function discoverProjectDir(): string {
  let dir = resolve(process.cwd());
  while (true) {
    const candidate = join(dir, ".pied-pi");
    if (existsSync(candidate) && existsSync(join(candidate, "harness.json"))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `pi-harness: Could not find .pied-pi/harness.json.\n` +
        `Searched from ${process.cwd()} to filesystem root.\n` +
        `Create a .pied-pi/harness.json in your project root.`
      );
    }
    dir = parent;
  }
}

export function loadConfig(piedPiDir: string): HarnessConfig {
  const configPath = join(piedPiDir, "harness.json");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as HarnessConfig;
  if (!parsed.phases || !Array.isArray(parsed.phases) || parsed.phases.length === 0) {
    throw new Error(`pi-harness: ${configPath} must contain a non-empty "phases" array.`);
  }
  for (let i = 0; i < parsed.phases.length; i++) {
    const p = parsed.phases[i];
    const prefix = `pi-harness: ${configPath} phases[${i}]`;
    if (typeof p.name !== "string" || p.name.length === 0) throw new Error(`${prefix}: "name" must be a non-empty string.`);
    if (typeof p.label !== "string" || p.label.length === 0) throw new Error(`${prefix} (${p.name}): "label" must be a non-empty string.`);
    if (!Array.isArray(p.requires)) throw new Error(`${prefix} (${p.name}): "requires" must be an array.`);
    if (typeof p.skill !== "string" || p.skill.length === 0) throw new Error(`${prefix} (${p.name}): "skill" must be a non-empty string.`);

    const skillPath = join(piedPiDir, "skills", p.skill, "SKILL.md");
    if (!existsSync(skillPath)) {
      throw new Error(
        `${prefix} (${p.name}): missing skill file at ${skillPath}. `
        + "Create the skill file or update harness.json to reference an existing skill.",
      );
    }
  }
  return parsed;
}
