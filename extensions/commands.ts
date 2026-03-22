import type { HarnessContext } from "./types";
import { freshState, getPhase } from "./helpers";

export function registerCommands(ctx: HarnessContext): void {
  ctx.pi.registerCommand("harness", {
    description: "Start the development harness",
    handler: async (_args, uiCtx) => {
      ctx.state = freshState(ctx.config.phases[0].name);
      ctx.persistState();
      const phase = getPhase(ctx.config, ctx.state.currentPhase);
      if (phase) {
        uiCtx.ui.setStatus("harness", phase.label);
      }
      uiCtx.ui.notify(`Harness activated — starting with ${phase?.label ?? ctx.state.currentPhase}`, "info");
      ctx.pi.sendUserMessage(
        "The development harness is now active. Call the harness_instructions tool to read the skill content for the current phase and begin.",
        { deliverAs: "followUp" },
      );
    },
  });

  ctx.pi.registerCommand("phase", {
    description: "Show the current harness phase and progress",
    handler: async (_args, uiCtx) => {
      if (!ctx.state.active) {
        uiCtx.ui.notify("Harness is not active. Use /harness to start.", "info");
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
      uiCtx.ui.setWidget("harness-progress", lines);
    },
  });

  ctx.pi.registerCommand("harness-complete", {
    description: "Mark a phase as completed (e.g., /harness-complete research)",
    handler: async (args, uiCtx) => {
      const target = args.trim();
      const phase = getPhase(ctx.config, target);
      if (!phase) {
        const validNames = ctx.config.phases.map((p) => p.name).join(", ");
        uiCtx.ui.notify(`Unknown phase: "${target}". Valid: ${validNames}`, "error");
        return;
      }
      if (ctx.state.completed.includes(phase.name)) {
        uiCtx.ui.notify(`"${phase.label}" is already completed.`, "info");
        return;
      }
      ctx.state.completed.push(phase.name);
      ctx.persistState();
      uiCtx.ui.notify(`Marked "${phase.label}" as completed.`, "info");
    },
  });
}
