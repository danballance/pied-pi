import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { dirname } from "node:path";
import { discoverProjectDir, loadConfig } from "./config";
import { freshState, CUSTOM_ENTRY_TYPE, getPhase, buildSystemPrompt } from "./helpers";
import { registerCommands } from "./commands";
import { registerTools } from "./tools";
import { writeHarnessStatus } from "./status";
import { log } from "./logging";
import type { HarnessContext, HarnessState } from "./types";

interface TurnDiagnostics {
  turnIndex: number | undefined;
  toolResultCount: number;
  hasMessage: boolean;
  stopReason: string | null;
  contentTypes: string[];
  errorMessagePreview: string | null;
}

function messageStopReason(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const value = (message as Record<string, unknown>).stopReason;
  return typeof value === "string" ? value : null;
}

function messageErrorPreview(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const value = (message as Record<string, unknown>).errorMessage;
  if (typeof value !== "string") {
    return null;
  }
  return value.replace(/\s+/g, " ").slice(0, 300) || null;
}

function messageContentTypes(message: unknown): string[] {
  if (!message || typeof message !== "object") {
    return [];
  }
  const content = (message as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).type : undefined))
    .filter((item): item is string => typeof item === "string");
}

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

  // Count consecutive recovery nudges to detect infinite nudge loops.
  let consecutiveNudges = 0;
  let agentEndFallbackAttempts = 0;
  let lastTurnDiagnostics: TurnDiagnostics | null = null;
  let lastQueuedNudge: string | null = null;
  let agentEndFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  const MAX_CONSECUTIVE_NUDGES = 3;
  const MAX_AGENT_END_FALLBACK_ATTEMPTS = 2;
  const AGENT_END_FALLBACK_DELAY_MS = 250;

  function clearAgentEndFallback(reason: string): void {
    if (agentEndFallbackTimer === null) {
      return;
    }
    clearTimeout(agentEndFallbackTimer);
    agentEndFallbackTimer = null;
    log("agent_end:fallback", { action: "cleared", reason });
  }

  // ── Event handlers ─────────────────────────────────────────────────

  function forceCompleteHarness(
    summary: string,
    uiCtx: {
      hasUI: boolean;
      ui: {
        setStatus: (key: string, text?: string) => void;
        notify: (message: string, type?: string) => void;
      };
    },
    reason: string,
  ): void {
    clearAgentEndFallback(reason);
    ctx.state.active = false;
    lastQueuedNudge = null;
    ctx.persistState();
    ctx.writeStatus(summary);
    log("force_complete", {
      phase: ctx.state.currentPhase,
      completed: ctx.state.completed,
      summary,
      reason,
    });
    if (uiCtx.hasUI) {
      uiCtx.ui.setStatus("harness", "Complete");
      uiCtx.ui.notify(summary, "warning");
    }
  }

  pi.on("session_start", async (_event, uiCtx) => {
    consecutiveNudges = 0;
    agentEndFallbackAttempts = 0;
    lastQueuedNudge = null;
    clearAgentEndFallback("session_start");
    log("session_start", { entriesCount: uiCtx.sessionManager.getEntries().length });
    for (const entry of uiCtx.sessionManager.getEntries()) {
      if (
        entry.type === "custom" &&
        entry.customType === CUSTOM_ENTRY_TYPE
      ) {
        ctx.state = entry.data as HarnessState;
      }
    }
    log("session_start", {
      restoredState: { active: ctx.state.active, phase: ctx.state.currentPhase, completed: ctx.state.completed },
    });
    if (ctx.state.active) {
      const phase = getPhase(config, ctx.state.currentPhase);
      if (phase) {
        uiCtx.ui.setStatus("harness", phase.label);
      }
    }
  });

  pi.on("turn_start", async (event, uiCtx) => {
    clearAgentEndFallback("turn_start");
    log("turn_start", {
      active: ctx.state.active,
      phase: ctx.state.currentPhase,
      turnIndex: event.turnIndex,
      hasPendingMessages: uiCtx.hasPendingMessages(),
      agentEndFallbackAttempts,
    });
  });

  pi.on("before_agent_start", async (event, _uiCtx) => {
    log("before_agent_start", { active: ctx.state.active, phase: ctx.state.currentPhase });
    if (!ctx.state.active) return;

    return {
      systemPrompt: event.systemPrompt + "\n" + buildSystemPrompt(config, ctx.state),
    };
  });

  pi.on("turn_end", async (event, uiCtx) => {
    const toolCount = event.toolResults?.length ?? 0;
    const stopReason = messageStopReason(event.message);
    const contentTypes = messageContentTypes(event.message);
    const errorMessagePreview = messageErrorPreview(event.message);
    lastTurnDiagnostics = {
      turnIndex: event.turnIndex,
      toolResultCount: toolCount,
      hasMessage: !!event.message,
      stopReason,
      contentTypes,
      errorMessagePreview,
    };
    log("turn_end", {
      active: ctx.state.active,
      phase: ctx.state.currentPhase,
      completed: ctx.state.completed,
      turnIndex: event.turnIndex,
      toolResultCount: toolCount,
      hasMessage: !!event.message,
      consecutiveNudges,
      stopReason,
      contentTypes,
      errorMessagePreview,
      hasPendingMessages: uiCtx.hasPendingMessages(),
    });

    if (toolCount > 0) {
      consecutiveNudges = 0;
      agentEndFallbackAttempts = 0;
      lastQueuedNudge = null;
      return;
    }

    if (!ctx.state.active) {
      log("turn_end:skip", { reason: "not active" });
      return;
    }

    if (ctx.state.completed.includes(ctx.state.currentPhase)) {
      log("turn_end:skip", { reason: "current phase already completed", phase: ctx.state.currentPhase });
      return;
    }

    if (stopReason === "error" && agentEndFallbackAttempts >= MAX_AGENT_END_FALLBACK_ATTEMPTS) {
      const phase = getPhase(config, ctx.state.currentPhase);
      forceCompleteHarness(
        `Forced harness completion after repeated unrecoverable model/tool-call errors in phase "${phase?.label ?? ctx.state.currentPhase}". Last error: ${errorMessagePreview ?? "unknown error"}`,
        uiCtx,
        "repeated_error_stops",
      );
      return;
    }

    if (consecutiveNudges >= MAX_CONSECUTIVE_NUDGES) {
      forceCompleteHarness(
        `Forced harness completion after repeated stalled turns in phase "${getPhase(config, ctx.state.currentPhase)?.label ?? ctx.state.currentPhase}".`,
        uiCtx,
        "max_consecutive_nudges",
      );
      return;
    }

    const phase = getPhase(config, ctx.state.currentPhase);
    const nudge =
      `The harness is still active in phase "${phase?.label ?? ctx.state.currentPhase}". `
      + "You stopped without using tools. Continue working by calling tools. "
      + "If the phase is already complete, call harness_advance with a concise summary. "
      + "If you are unsure what to do next, call harness_instructions to review the phase requirements.";

    log("turn_end:nudge", {
      phase: ctx.state.currentPhase,
      attempt: consecutiveNudges + 1,
      deliverAs: "steer",
      stopReason,
      contentTypes,
      errorMessagePreview,
      hasPendingMessagesBefore: uiCtx.hasPendingMessages(),
    });

    try {
      await ctx.pi.sendUserMessage(nudge, { deliverAs: "steer" });
      lastQueuedNudge = nudge;
      consecutiveNudges++;
      log("turn_end:nudge", {
        result: "queued",
        consecutiveNudges,
        hasPendingMessagesAfter: uiCtx.hasPendingMessages(),
      });
    } catch (err) {
      log("turn_end:nudge", { result: "sendUserMessage threw", error: String(err) });
    }
  });

  pi.on("agent_end", async (_event, uiCtx) => {
    log("agent_end", {
      active: ctx.state.active,
      phase: ctx.state.currentPhase,
      completed: ctx.state.completed,
      consecutiveNudges,
      hasUI: uiCtx.hasUI,
      hasPendingMessages: uiCtx.hasPendingMessages(),
      lastTurnDiagnostics,
    });
    if (!ctx.state.active) {
      log("agent_end:skip", { reason: "not active" });
      return;
    }

    const phase = getPhase(config, ctx.state.currentPhase);
    if (phase && uiCtx.hasUI) {
      log("agent_end:setStatus", { phase: phase.label });
      uiCtx.ui.setStatus("harness", phase.label);
    }

    const shouldScheduleFallback = (
      lastTurnDiagnostics?.stopReason === "error"
      && uiCtx.hasPendingMessages()
      && lastQueuedNudge !== null
      && agentEndFallbackAttempts < MAX_AGENT_END_FALLBACK_ATTEMPTS
    );
    if (!shouldScheduleFallback) {
      log("agent_end:fallback", {
        action: "skip",
        stopReason: lastTurnDiagnostics?.stopReason,
        hasPendingMessages: uiCtx.hasPendingMessages(),
        hasQueuedNudge: lastQueuedNudge !== null,
        agentEndFallbackAttempts,
        maxAttempts: MAX_AGENT_END_FALLBACK_ATTEMPTS,
      });
      return;
    }

    clearAgentEndFallback("reschedule");
    log("agent_end:fallback", {
      action: "scheduled",
      delayMs: AGENT_END_FALLBACK_DELAY_MS,
      attempt: agentEndFallbackAttempts + 1,
      stopReason: lastTurnDiagnostics?.stopReason,
      errorMessagePreview: lastTurnDiagnostics?.errorMessagePreview,
      hasPendingMessages: uiCtx.hasPendingMessages(),
    });
    agentEndFallbackTimer = setTimeout(() => {
      const nudge = lastQueuedNudge;
      agentEndFallbackTimer = null;
      if (nudge === null) {
        log("agent_end:fallback", { action: "skipped_at_fire", reason: "no queued nudge" });
        return;
      }
      agentEndFallbackAttempts++;
      log("agent_end:fallback", {
        action: "fire",
        attempt: agentEndFallbackAttempts,
        stopReason: lastTurnDiagnostics?.stopReason,
      });
      try {
        ctx.pi.sendUserMessage(nudge);
        log("agent_end:fallback", {
          action: "sendUserMessage dispatched",
          attempt: agentEndFallbackAttempts,
        });
      } catch (err) {
        log("agent_end:fallback", {
          action: "sendUserMessage failed",
          attempt: agentEndFallbackAttempts,
          error: String(err),
        });
      }
    }, AGENT_END_FALLBACK_DELAY_MS);
  });

  // ── Register commands & tools ──────────────────────────────────────

  registerCommands(ctx);
  registerTools(ctx);
}
