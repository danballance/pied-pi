import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import registerPiedPi from "../index";

interface HandlerMap {
  session_start?: (event: object, ctx: any) => Promise<void>;
  turn_start?: (event: object, ctx: any) => Promise<void>;
  turn_end?: (event: object, ctx: any) => Promise<void>;
  agent_end?: (event: object, ctx: any) => Promise<void>;
  before_agent_start?: (event: object, ctx: any) => Promise<object | void>;
}

function createProject(): string {
  const baseDir = mkdtempSync(join(tmpdir(), "pied-pi-recovery-"));
  const piedPiDir = join(baseDir, ".pied-pi");

  mkdirSync(join(piedPiDir, "skills", "planning"), { recursive: true });
  mkdirSync(join(piedPiDir, "skills", "implementation"), { recursive: true });

  writeFileSync(
    join(piedPiDir, "harness.json"),
    JSON.stringify({
      phases: [
        { name: "planning", label: "Planning", requires: [], skill: "planning" },
        {
          name: "implementation",
          label: "Implementation",
          requires: ["planning"],
          skill: "implementation",
        },
      ],
    }),
    "utf-8",
  );
  writeFileSync(join(piedPiDir, "skills", "planning", "SKILL.md"), "# planning\n", "utf-8");
  writeFileSync(join(piedPiDir, "skills", "implementation", "SKILL.md"), "# implementation\n", "utf-8");

  return baseDir;
}

function readStatus(projectRoot: string) {
  return JSON.parse(readFileSync(join(projectRoot, ".pied-pi", "park-bench-status.json"), "utf-8"));
}

function createPiMock() {
  const handlers: HandlerMap = {};

  const pi = {
    on: vi.fn((event: keyof HandlerMap, handler: HandlerMap[keyof HandlerMap]) => {
      handlers[event] = handler as never;
    }),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
    appendEntry: vi.fn(),
    sendUserMessage: vi.fn(),
  };

  return { pi, handlers };
}

function createSessionContext(
  active = true,
  completed = ["planning"],
  hasPendingMessages = false,
) {
  return {
    hasUI: false,
    ui: {
      setStatus: vi.fn(),
      notify: vi.fn(),
    },
    hasPendingMessages: vi.fn(() => hasPendingMessages),
    sessionManager: {
      getEntries: vi.fn(() => [
        {
          type: "custom",
          customType: "pi-harness-state",
          data: {
            active,
            currentPhase: "implementation",
            completed,
          },
        },
      ]),
    },
  };
}

describe("pied-pi recovery nudges", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    vi.useRealTimers();
    process.chdir(originalCwd);
  });

  it("queues a steering nudge on a text-only stop during an active phase", async () => {
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));
    await handlers.turn_end?.(
      {
        turnIndex: 3,
        message: { role: "assistant", content: "done for now" },
        toolResults: [],
      },
      createSessionContext(true),
    );

    expect(pi.sendUserMessage).toHaveBeenCalledTimes(1);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      expect.stringContaining("If the phase is already complete, call harness_advance"),
      { deliverAs: "steer" },
    );
  });

  it("does not nudge after the consecutive nudge limit is reached", async () => {
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));

    for (let turn = 0; turn < 4; turn += 1) {
      await handlers.turn_end?.(
        {
          turnIndex: turn,
          message: { role: "assistant", content: "stopping" },
          toolResults: [],
        },
        createSessionContext(true),
      );
    }

    expect(pi.sendUserMessage).toHaveBeenCalledTimes(3);
  });

  it("resets the nudge counter after a tool-using turn", async () => {
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));

    await handlers.turn_end?.(
      {
        turnIndex: 0,
        message: { role: "assistant", content: "stopping" },
        toolResults: [],
      },
      createSessionContext(true),
    );
    await handlers.turn_end?.(
      {
        turnIndex: 1,
        message: { role: "assistant", content: "used tool" },
        toolResults: [{ toolName: "read" }],
      },
      createSessionContext(true),
    );
    await handlers.turn_end?.(
      {
        turnIndex: 2,
        message: { role: "assistant", content: "stopping again" },
        toolResults: [],
      },
      createSessionContext(true),
    );

    expect(pi.sendUserMessage).toHaveBeenCalledTimes(2);
  });

  it("does not nudge when the current phase is already marked complete", async () => {
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true, ["planning", "implementation"]));
    await handlers.turn_end?.(
      {
        turnIndex: 0,
        message: { role: "assistant", content: "done" },
        toolResults: [],
      },
      createSessionContext(true, ["planning", "implementation"]),
    );

    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("schedules an agent_end fallback prompt after an error stop with queued messages", async () => {
    vi.useFakeTimers();
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));
    await handlers.turn_end?.(
      {
        turnIndex: 3,
        message: {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "checking" },
            { type: "toolCall", id: "call-1", name: "read", arguments: {} },
          ],
          stopReason: "error",
          errorMessage: "invalid json",
        },
        toolResults: [],
      },
      createSessionContext(true),
    );

    await handlers.agent_end?.({}, createSessionContext(true, ["planning"], true));
    await vi.advanceTimersByTimeAsync(300);

    expect(pi.sendUserMessage).toHaveBeenCalledTimes(2);
    expect(pi.sendUserMessage.mock.calls[0][1]).toEqual({ deliverAs: "steer" });
    expect(pi.sendUserMessage.mock.calls[1]).toEqual([
      expect.stringContaining("If the phase is already complete, call harness_advance"),
    ]);
  });

  it("cancels the agent_end fallback when another turn starts", async () => {
    vi.useFakeTimers();
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));
    await handlers.turn_end?.(
      {
        turnIndex: 3,
        message: {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "checking" },
            { type: "toolCall", id: "call-1", name: "read", arguments: {} },
          ],
          stopReason: "error",
          errorMessage: "invalid json",
        },
        toolResults: [],
      },
      createSessionContext(true),
    );

    await handlers.agent_end?.({}, createSessionContext(true, ["planning"], true));
    await handlers.turn_start?.({ turnIndex: 4 }, createSessionContext(true, ["planning"], false));
    await vi.advanceTimersByTimeAsync(300);

    expect(pi.sendUserMessage).toHaveBeenCalledTimes(1);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      expect.stringContaining("If the phase is already complete, call harness_advance"),
      { deliverAs: "steer" },
    );
  });

  it("forces harness completion after repeated unrecoverable error stops", async () => {
    vi.useFakeTimers();
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(true));

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await handlers.turn_end?.(
        {
          turnIndex: attempt,
          message: {
            role: "assistant",
            content: [
              { type: "thinking", thinking: "checking" },
              { type: "toolCall", id: `call-${attempt}`, name: "read", arguments: {} },
            ],
            stopReason: "error",
            errorMessage: `invalid json ${attempt}`,
          },
          toolResults: [],
        },
        createSessionContext(true),
      );
      await handlers.agent_end?.({}, createSessionContext(true, ["planning"], true));
      await vi.advanceTimersByTimeAsync(300);
    }

    await handlers.turn_end?.(
      {
        turnIndex: 3,
        message: {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "checking" },
            { type: "toolCall", id: "call-3", name: "read", arguments: {} },
          ],
          stopReason: "error",
          errorMessage: "invalid json 3",
        },
        toolResults: [],
      },
      createSessionContext(true),
    );

    const status = readStatus(projectRoot);
    expect(status.status).toBe("completed");
    expect(status.current_phase).toBeNull();
    expect(status.completed_phases).toEqual(["planning"]);
    expect(status.summary).toContain("Forced harness completion after repeated unrecoverable model/tool-call errors");
    expect(pi.sendUserMessage).toHaveBeenCalledTimes(4);
  });

  it("does not nudge when the harness is inactive", async () => {
    const projectRoot = createProject();
    const { pi, handlers } = createPiMock();
    process.chdir(projectRoot);

    registerPiedPi(pi as never);
    await handlers.session_start?.({}, createSessionContext(false));
    await handlers.turn_end?.(
      {
        turnIndex: 0,
        message: { role: "assistant", content: "done" },
        toolResults: [],
      },
      createSessionContext(false),
    );

    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });
});
