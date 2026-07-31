import { describe, it, expect } from "vitest";
import {
  processConversationTurn,
  getWorkflowDebugInfo,
  isWorkflowActive,
} from "@/lib/conversation-engine";
import { createInitialContext } from "@/types";

describe("conversation-engine", () => {
  it("starts appointment workflow on intent", () => {
    const ctx = createInitialContext("en");
    const result = processConversationTurn("I need an appointment", ctx);
    expect(result.context.currentWorkflow).toBe("appointment");
    expect(result.context.workflowStatus).toBe("active");
    expect(result.context.currentStep).toBe("ask_name");
  });

  it("collects name then asks for phone", () => {
    let ctx = createInitialContext("en");
    ctx = processConversationTurn("book appointment", ctx).context;
    const result = processConversationTurn("Raj Kumar", ctx);
    expect(result.context.name).toBe("Raj Kumar");
    expect(result.context.currentStep).toBe("ask_phone");
    expect(result.reply.toLowerCase()).toContain("mobile");
  });

  it("rejects invalid phone and stays on ask_phone", () => {
    let ctx = createInitialContext("en");
    ctx = processConversationTurn("appointment please", ctx).context;
    ctx = processConversationTurn("Test User", ctx).context;
    const result = processConversationTurn("123", ctx);
    expect(result.context.currentStep).toBe("ask_phone");
    expect(result.context.phone).toBeUndefined();
    expect(result.reply.toLowerCase()).toContain("mobile");
  });

  it("accepts valid phone and advances", () => {
    let ctx = createInitialContext("en");
    ctx = processConversationTurn("appointment", ctx).context;
    ctx = processConversationTurn("Test User", ctx).context;
    const result = processConversationTurn("9876543210", ctx);
    expect(result.context.phone).toBe("9876543210");
    expect(result.context.currentStep).toBe("ask_department");
  });

  it("reports workflow debug info", () => {
    let ctx = createInitialContext("en");
    ctx = processConversationTurn("appointment", ctx).context;
    ctx = processConversationTurn("Alice", ctx).context;
    const debug = getWorkflowDebugInfo(ctx);
    expect(debug.workflow).toBe("appointment");
    expect(debug.collected.name).toBe("Alice");
    expect(debug.missing).toContain("phone");
  });

  it("detects active workflow", () => {
    let ctx = createInitialContext("en");
    expect(isWorkflowActive(ctx)).toBe(false);
    ctx = processConversationTurn("emergency help", ctx).context;
    expect(isWorkflowActive(ctx)).toBe(true);
  });
});
