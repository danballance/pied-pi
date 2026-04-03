import { Type } from "@sinclair/typebox";
import type { HarnessContext } from "./types";
import { getPhase, nextPhase, loadSkillContent } from "./helpers";
import { log } from "./logging";

export function registerTools(ctx: HarnessContext): void {
  ctx.pi.registerTool({
    name: "harness_advance",
    label: "Advance Phase",
    description:
      "Signal that the current harness phase is complete and advance to the next phase. " +
      "Call this ONLY when you have fulfilled all requirements of the current phase.",
    parameters: Type.Object({
      summary: Type.String({
        description: "Brief summary of what was accomplished in this phase",
      }),
    }),
    promptGuidelines:
      "Use harness_advance when you have completed all deliverables for the current phase.",
    async execute(_toolCallId, params, _signal, _onUpdate, uiCtx) {
      log("harness_advance:execute", { active: ctx.state.active, phase: ctx.state.currentPhase, summary: params.summary });
      if (!ctx.state.active) {
        log("harness_advance:execute", { result: "not active" });
        return {
          content: [{ type: "text", text: "Harness is not active." }],
          details: {},
        };
      }

      const phase = getPhase(ctx.config, ctx.state.currentPhase);
      if (!phase) {
        return {
          content: [{ type: "text", text: `Unknown current phase: "${ctx.state.currentPhase}".` }],
          details: {},
        };
      }

      if (ctx.state.completed.includes(phase.name)) {
        return {
          content: [{ type: "text", text: `Phase "${phase.label}" is already completed.` }],
          details: {},
        };
      }

      // Advance: push to completed
      ctx.state.completed.push(phase.name);

      const next = nextPhase(ctx.config, ctx.state);

      if (!next) {
        ctx.state.active = false;
        ctx.persistState();
        ctx.writeStatus(params.summary);
        log("harness_advance:execute", { result: "all phases complete", completed: ctx.state.completed });
        if (uiCtx.hasUI) uiCtx.ui.setStatus("harness", "Complete");
        return {
          content: [
            {
              type: "text",
              text:
                `Phase "${phase.label}" complete. ` +
                `All phases finished! Harness deactivated.\n\nSummary: ${params.summary}`,
            },
          ],
          details: {},
        };
      }

      ctx.state.currentPhase = next.name;
      ctx.persistState();
      ctx.writeStatus();
      log("harness_advance:execute", { result: "advanced", from: phase!.name, to: next.name, completed: ctx.state.completed });
      if (uiCtx.hasUI) uiCtx.ui.setStatus("harness", next.label);

      return {
        content: [
          {
            type: "text",
            text:
              `Phase "${phase.label}" complete.\n` +
              `Summary: ${params.summary}\n\n` +
              `Advancing to: ${next.label}.\n` +
              `Call harness_instructions to read the phase skill content and proceed.`,
          },
        ],
        details: {},
      };
    },
  });

  ctx.pi.registerTool({
    name: "harness_instructions",
    label: "Phase Instructions",
    description:
      "Get the skill content / detailed instructions for the current harness phase.",
    parameters: Type.Object({}),
    async execute() {
      log("harness_instructions:execute", { active: ctx.state.active, phase: ctx.state.currentPhase });
      if (!ctx.state.active) {
        return {
          content: [{ type: "text", text: "Harness is not active." }],
          details: {},
        };
      }

      const phase = getPhase(ctx.config, ctx.state.currentPhase)!;
      const content = loadSkillContent(ctx.piedPiDir, phase.skill);
      log("harness_instructions:execute", { skill: phase.skill, contentLength: content.length });
      return {
        content: [{ type: "text", text: content }],
        details: {},
      };
    },
  });
}
