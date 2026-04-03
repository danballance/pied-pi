import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";

function createHarnessDir(): string {
  const baseDir = mkdtempSync(join(tmpdir(), "pied-pi-config-"));
  const piedPiDir = join(baseDir, ".pied-pi");
  mkdirSync(piedPiDir, { recursive: true });
  return piedPiDir;
}

function writeHarnessConfig(piedPiDir: string, skill = "planning"): void {
  writeFileSync(
    join(piedPiDir, "harness.json"),
    JSON.stringify({
      phases: [
        {
          name: "planning",
          label: "Planning",
          requires: [],
          skill,
        },
      ],
    }),
    "utf-8",
  );
}

function writeSkill(piedPiDir: string, skill: string): void {
  const skillDir = join(piedPiDir, "skills", skill);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), "# skill\n", "utf-8");
}

describe("loadConfig", () => {
  it("loads a config when every phase skill file exists", () => {
    const piedPiDir = createHarnessDir();
    writeHarnessConfig(piedPiDir);
    writeSkill(piedPiDir, "planning");

    const config = loadConfig(piedPiDir);

    expect(config.phases).toHaveLength(1);
    expect(config.phases[0].skill).toBe("planning");
  });

  it("fails fast when a configured skill file is missing", () => {
    const piedPiDir = createHarnessDir();
    writeHarnessConfig(piedPiDir, "test-creation");

    expect(() => loadConfig(piedPiDir)).toThrowError(
      /missing skill file .*test-creation\/SKILL.md/,
    );
  });
});
