import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { dirname } from "node:path";
import { discoverProjectDir, loadConfig } from "./config";
import { freshState, CUSTOM_ENTRY_TYPE, getPhase, buildSystemPrompt } from "./helpers";
import { registerCommands } from "./commands";
import { registerTools } from "./tools";
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

  // ── Register commands & tools ──────────────────────────────────────

  registerCommands(ctx);
  registerTools(ctx);
}
