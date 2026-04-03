import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { registerCommands } from "../commands";
import { writeHarnessStatus } from "../status";
import { registerTools } from "../tools";
import type { HarnessContext, HarnessState } from "../types";

function createContext(baseDir: string): HarnessContext {
  const commands = new Map<string, (args: string, uiCtx: any) => Promise<void>>();
  const tools = new Map<string, any>();
  const piedPiDir = join(baseDir, ".pied-pi");
  mkdirSync(piedPiDir, { recursive: true });

  const context: HarnessContext = {
    pi: {
      registerCommand(name: string, command: { handler: (args: string, uiCtx: any) => Promise<void> }) {
        commands.set(name, command.handler);
      },
      registerTool(tool: { name: string }) {
        tools.set(tool.name, tool);
      },
      appendEntry: vi.fn(),
      sendUserMessage: vi.fn(),
    } as never,
    config: {
      phases: [
        { name: "planning", label: "Planning", requires: [], skill: "planning" },
        {
          name: "documentation",
          label: "Documentation",
          requires: ["planning"],
          skill: "documentation",
        },
      ],
    },
    state: {
      currentPhase: "planning",
      completed: [],
      active: false,
    },
    piedPiDir,
    projectRoot: baseDir,
    persistState: vi.fn(),
    writeStatus(summary = null) {
      writeHarnessStatus(piedPiDir, context.state, summary);
    },
  };

  registerCommands(context);
  registerTools(context);
  return Object.assign(context, { commands, tools });
}

function readStatus(baseDir: string) {
  return JSON.parse(readFileSync(join(baseDir, ".pied-pi", "park-bench-status.json"), "utf-8"));
}

describe("pied-pi status contract", () => {
  it("writes running status on /harness", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pied-pi-"));
    const context = createContext(baseDir) as HarnessContext & {
      commands: Map<string, (args: string, uiCtx: any) => Promise<void>>;
    };
    const uiCtx = { hasUI: false, ui: { setStatus: vi.fn(), notify: vi.fn() } };

    await context.commands.get("harness")?.("", uiCtx);

    const status = readStatus(baseDir);
    expect(status.status).toBe("running");
    expect(status.current_phase).toBe("planning");
    expect(status.completed_phases).toEqual([]);
    expect(status.summary).toBeNull();
  });

  it("writes completed status on final harness_advance", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pied-pi-"));
    const context = createContext(baseDir) as HarnessContext & {
      tools: Map<string, { execute: (...args: any[]) => Promise<any> }>;
    };
    context.state.active = true;
    context.state.currentPhase = "documentation";
    context.state.completed = ["planning"];

    await context.tools.get("harness_advance")?.execute(
      "call-1",
      { summary: "finished docs" },
      undefined,
      undefined,
      { hasUI: false, ui: { setStatus: vi.fn() } },
    );

    const status = readStatus(baseDir);
    expect(status.status).toBe("completed");
    expect(status.current_phase).toBeNull();
    expect(status.completed_phases).toEqual(["planning", "documentation"]);
    expect(status.summary).toBe("finished docs");
  });
});
