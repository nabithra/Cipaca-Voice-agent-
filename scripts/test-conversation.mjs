const base = process.env.TEST_URL ?? "http://localhost:3000/api/chat";
let ctx = null;
const msgs = [];
const GENERIC =
  /I can help with appointments, emergencies, and hospital information/i;

async function send(text) {
  msgs.push({ role: "user", content: text });
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: msgs,
      language: "en",
      sessionId: "test-workflow",
      conversationContext: ctx,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("FAIL", res.status, data);
    process.exit(1);
  }
  ctx = data.conversationContext;
  msgs.push({ role: "assistant", content: data.reply });

  if (GENERIC.test(data.reply) && ctx.workflowStatus === "active") {
    console.error(`\nBUG: Generic response during active workflow after "${text}"`);
    console.error(`AI: ${data.reply}`);
    console.error(`Context:`, ctx);
    process.exit(1);
  }

  console.log(`\nUser: ${text}`);
  console.log(
    `Workflow: ${ctx.currentWorkflow} | Step: ${ctx.currentStep} | Status: ${ctx.workflowStatus} | name: ${ctx.name ?? "-"}`
  );
  console.log(`AI: ${data.reply}`);
  return data;
}

const steps = [
  "Appointment",
  "Raja",
  "9876543210",
  "Cardiology",
  "Dr Kumar",
  "5 August",
  "10 AM",
  "No",
];

for (const step of steps) {
  await send(step);
}

if (ctx.state !== "SESSION_CLOSED" && ctx.workflowStatus !== "closed") {
  console.error("\nExpected session closed, got", ctx.state, ctx.workflowStatus);
  process.exit(1);
}

console.log("\n✓ Full appointment workflow passed with zero generic responses");

// Tamil smoke test
ctx = {
  conversationId: "conv-ta",
  state: "IDLE",
  currentWorkflow: null,
  workflowStatus: "idle",
  currentStep: "classify",
  intent: null,
  language: "ta",
  greeted: false,
  awaitingAnythingElse: false,
  appointmentSaved: false,
};
msgs.length = 0;

await send("appointment book pannanum");
await send("Ravi");

if (ctx.currentWorkflow !== "appointment" || !ctx.name) {
  console.error("Tamil workflow failed", ctx);
  process.exit(1);
}
console.log("\n✓ Tamil appointment workflow passed");

// Emergency workflow test
ctx = null;
msgs.length = 0;

await send("There has been an accident.");
if (ctx.currentWorkflow !== "emergency" || ctx.currentStep !== "ask_name") {
  console.error("Emergency workflow did not start", ctx);
  process.exit(1);
}

const emergencySteps = [
  "Ravi Kumar",
  "9876543210",
  "NH 48 near Tiruvannamalai",
  "Road accident with head injury",
  "Yes",
];

for (const step of emergencySteps) {
  await send(step);
}

if (ctx.workflowStatus !== "completed" || !ctx.referenceId?.startsWith("EMG-")) {
  console.error("\nExpected completed emergency with EMG ticket, got", ctx);
  process.exit(1);
}

const lastReply = msgs[msgs.length - 1]?.content ?? "";
if (!/Emergency ticket EMG-/.test(lastReply) || !/emergency team has been notified/i.test(lastReply)) {
  console.error("\nMissing handoff message:", lastReply);
  process.exit(1);
}

console.log("\n✓ Full emergency workflow passed with ticket", ctx.referenceId);
