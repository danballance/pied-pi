import type { HarnessContext } from "./types";
import { freshState, getPhase } from "./helpers";
import { log } from "./logging";

export function registerCommands(ctx: HarnessContext): void {
  ctx.pi.registerCommand("harness", {
    description: "Start the development harness",
    handler: async (_args, uiCtx) => {
      log("/harness", { action: "start", firstPhase: ctx.config.phases[0].name });
      ctx.state = freshState(ctx.config.phases[0].name);
      ctx.persistState();
      ctx.writeStatus();
      const phase = getPhase(ctx.config, ctx.state.currentPhase);
      if (uiCtx.hasUI) {
        if (phase) {
          uiCtx.ui.setStatus("harness", phase.label);
        }
        uiCtx.ui.notify(`Harness activated — starting with ${phase?.label ?? ctx.state.currentPhase}`, "info");
      }
      await ctx.pi.sendUserMessage(
        "The development harness is now active. Call the harness_instructions tool to read the skill content for the current phase and begin.",
        { deliverAs: "followUp" },
      );
    },
  });

  ctx.pi.registerCommand("phase", {
    description: "Show the current harness phase and progress",
    handler: async (_args, uiCtx) => {
      if (!ctx.state.active) {
        if (uiCtx.hasUI) uiCtx.ui.notify("Harness is not active. Use /harness to start.", "info");
        return;
      }
      const lines = [
        `Current: ${getPhase(ctx.config, ctx.state.currentPhase)?.label ?? ctx.state.currentPhase}`,
        "",
        "Progress:",
        ...ctx.config.phases.map((p) => {
          if (ctx.state.completed.includes(p.name)) return `  [done] ${p.label}`;
          if (p.name === ctx.state.currentPhase) return `  [>>]   ${p.label}`;
          return `  [  ]   ${p.label}`;
        }),
      ];
      if (uiCtx.hasUI) uiCtx.ui.setWidget("harness-progress", lines);
    },
  });

  ctx.pi.registerCommand("harness-complete", {
    description: "Mark a phase as completed (e.g., /harness-complete research)",
    handler: async (args, uiCtx) => {
      const target = args.trim();
      const phase = getPhase(ctx.config, target);
      if (!phase) {
        const validNames = ctx.config.phases.map((p) => p.name).join(", ");
        if (uiCtx.hasUI) uiCtx.ui.notify(`Unknown phase: "${target}". Valid: ${validNames}`, "error");
        return;
      }
      if (ctx.state.completed.includes(phase.name)) {
        if (uiCtx.hasUI) uiCtx.ui.notify(`"${phase.label}" is already completed.`, "info");
        return;
      }
      ctx.state.completed.push(phase.name);
      ctx.persistState();
      ctx.writeStatus();
      if (uiCtx.hasUI) uiCtx.ui.notify(`Marked "${phase.label}" as completed.`, "info");
    },
  });
}
