import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { dirname } from "node:path";
import { discoverProjectDir, loadConfig } from "./config";
import { freshState, CUSTOM_ENTRY_TYPE, getPhase, buildSystemPrompt } from "./helpers";
import { registerCommands } from "./commands";
import { registerTools } from "./tools";
import { writeHarnessStatus } from "./status";
import type { HarnessContext, HarnessState } from "./types";

export default function (pi: ExtensionAPI) {
  const piedPiDir = discoverProjectDir();
  const projectRoot = dirname(piedPiDir);
  const config = loadConfig(piedPiDir);

  const ctx: HarnessContext = {
    pi,
    config,
    state: freshState(config.phases[0].name),
    piedPiDir,
    projectRoot,
    persistState() {
      pi.appendEntry(CUSTOM_ENTRY_TYPE, structuredClone(ctx.state));
    },
    writeStatus(summary = null) {
      writeHarnessStatus(ctx.piedPiDir, ctx.state, summary);
    },
  };
  ctx.state.active = false;

  // ── Event handlers ─────────────────────────────────────────────────

  pi.on("session_start", async (_event, uiCtx) => {
    for (const entry of uiCtx.sessionManager.getEntries()) {
      if (
        entry.type === "custom" &&
        entry.customType === CUSTOM_ENTRY_TYPE
      ) {
        ctx.state = entry.data as HarnessState;
      }
    }
    if (ctx.state.active) {
      const phase = getPhase(config, ctx.state.currentPhase);
      if (phase) {
        uiCtx.ui.setStatus("harness", phase.label);
      }
    }
  });

  pi.on("before_agent_start", async (event, _uiCtx) => {
    if (!ctx.state.active) return;

    return {
      systemPrompt: event.systemPrompt + "\n" + buildSystemPrompt(config, ctx.state),
    };
  });

  pi.on("agent_end", async (_event, uiCtx) => {
    if (!ctx.state.active) return;

    const phase = getPhase(config, ctx.state.currentPhase);
    if (phase && uiCtx.hasUI) {
      uiCtx.ui.setStatus("harness", phase.label);
    }

    ctx.pi.sendUserMessage(
      `The harness is still active. Continue working on the current phase (${phase?.label ?? ctx.state.currentPhase}). Do not stop yet. Only finish when you have completed the phase deliverables and called harness_advance. If you need the phase instructions again, call harness_instructions.`,
    );
  });

  // ── Register commands & tools ──────────────────────────────────────

  registerCommands(ctx);
  registerTools(ctx);
}
