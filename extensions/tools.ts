import { Type } from "@sinclair/typebox";
import type { HarnessContext } from "./types";
import { getPhase, nextPhase, checkFilesExist, loadSkillContent } from "./helpers";

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
    async execute(_toolCallId, params, _onUpdate, uiCtx) {
      if (!ctx.state.active) {
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

      // Files-exist gate
      const missing = checkFilesExist(phase, ctx.state.slug, ctx.projectRoot);
      if (missing.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Cannot advance — required files are missing:\n${missing.map((f) => `  - ${f}`).join("\n")}`,
            },
          ],
          details: {},
        };
      }

      // Confirm gate (two-call pattern)
      if (phase.confirm && !ctx.state.pendingConfirm) {
        ctx.state.pendingConfirm = true;
        ctx.persistState();
        return {
          content: [
            {
              type: "text",
              text:
                `Phase "${phase.label}" requires user confirmation before advancing. ` +
                `Present your work to the user and wait for their approval. ` +
                `Once the user confirms, call harness_advance again to complete the phase.`,
            },
          ],
          details: {},
        };
      }

      // Advance: push to completed, reset pendingConfirm
      ctx.state.completed.push(phase.name);
      ctx.state.pendingConfirm = false;

      const next = nextPhase(ctx.config, ctx.state);

      if (!next) {
        ctx.state.active = false;
        ctx.persistState();
        uiCtx.ui.setStatus("harness", "Complete");
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
      uiCtx.ui.setStatus("harness", next.label);

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
    name: "harness_skip",
    label: "Skip Optional Phase",
    description:
      "Skip an optional phase. Only phases marked as optional in the config can be skipped.",
    parameters: Type.Object({
      phase: Type.String({
        description: "Name of the phase to skip",
      }),
      reason: Type.String({
        description: "Why this phase is being skipped",
      }),
    }),
    async execute(_toolCallId, params, _onUpdate, uiCtx) {
      const target = getPhase(ctx.config, params.phase);

      if (!target) {
        const validNames = ctx.config.phases.map((p) => p.name).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Unknown phase: "${params.phase}". Valid phases: ${validNames}`,
            },
          ],
          details: {},
        };
      }

      if (!target.optional) {
        return {
          content: [
            {
              type: "text",
              text: `Cannot skip "${target.label}" — it is not an optional phase.`,
            },
          ],
          details: {},
        };
      }

      if (ctx.state.skipped.includes(target.name)) {
        return {
          content: [
            {
              type: "text",
              text: `Phase "${target.label}" is already skipped.`,
            },
          ],
          details: {},
        };
      }

      ctx.state.skipped.push(target.name);
      ctx.persistState();

      // If the current phase was skipped, advance to next
      if (ctx.state.currentPhase === target.name) {
        const next = nextPhase(ctx.config, ctx.state);
        if (next) {
          ctx.state.currentPhase = next.name;
          ctx.persistState();
          uiCtx.ui.setStatus("harness", next.label);
        }
      }

      const currentPhase = getPhase(ctx.config, ctx.state.currentPhase);
      return {
        content: [
          {
            type: "text",
            text:
              `Skipped ${target.label}. Reason: ${params.reason}\n` +
              `Current phase: ${currentPhase?.label ?? ctx.state.currentPhase}`,
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
      if (!ctx.state.active) {
        return {
          content: [{ type: "text", text: "Harness is not active." }],
          details: {},
        };
      }

      const phase = getPhase(ctx.config, ctx.state.currentPhase)!;
      const content = loadSkillContent(ctx.piedPiDir, phase.skill);
      return {
        content: [{ type: "text", text: content }],
        details: {},
      };
    },
  });

  ctx.pi.registerTool({
    name: "harness_status",
    label: "Harness Status",
    description:
      "Get the current harness state including phase, slug, and progress.",
    parameters: Type.Object({}),
    async execute() {
      if (!ctx.state.active) {
        return {
          content: [{ type: "text", text: "Harness is not active." }],
          details: {},
        };
      }

      const currentPhase = getPhase(ctx.config, ctx.state.currentPhase);
      const lines = [
        `Current Phase: ${currentPhase?.label ?? ctx.state.currentPhase}`,
        `Slug: ${ctx.state.slug}`,
        "",
        "Progress:",
        ...ctx.config.phases.map((p) => {
          if (ctx.state.completed.includes(p.name)) return `  [done] ${p.label}`;
          if (ctx.state.skipped.includes(p.name)) return `  [skip] ${p.label}`;
          if (p.name === ctx.state.currentPhase) return `  [>>]   ${p.label}`;
          return `  [  ]   ${p.label}`;
        }),
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {},
      };
    },
  });
}
