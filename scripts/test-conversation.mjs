const base = process.env.TEST_URL ?? "http://localhost:3000/api/chat";
let ctx = null;
const msgs = [];
const GENERIC =
  /I can help with appointments, emergencies, and hospital information/i;

const TAMIL_SCRIPT = /[\u0B80-\u0BFF]/;
const BARE_LATIN_LOANWORDS =
  /\b(department|doctor|mobile|appointment|help|hospital|emergency|scan|booking|session|restart|connect|confirm|specialist|admission|information|condition|reference|priority|executive|number|accident|reason|hold|team|unit|call|book|date|time)\b/i;

function checkLanguage(reply, language) {
  if (language === "en" && TAMIL_SCRIPT.test(reply)) {
    console.error(`\nLANGUAGE BUG: Tamil script in English response:\n${reply}`);
    process.exit(1);
  }
  if (language === "ta" && !TAMIL_SCRIPT.test(reply)) {
    console.error(`\nLANGUAGE BUG: Tamil mode should display Tamil script:\n${reply}`);
    process.exit(1);
  }
  if (language === "ta" && BARE_LATIN_LOANWORDS.test(reply)) {
    console.error(`\nPHONETIC BUG: Bare Latin loanword in Tamil reply:\n${reply}`);
    process.exit(1);
  }
}

async function send(text, language = "en") {
  msgs.push({ role: "user", content: text });
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: msgs,
      language,
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

  checkLanguage(data.reply, language);

  if (GENERIC.test(data.reply) && ctx.workflowStatus === "active") {
    console.error(`\nBUG: Generic response during active workflow after "${text}"`);
    console.error(`AI: ${data.reply}`);
    process.exit(1);
  }

  console.log(`\nUser: ${text}`);
  console.log(
    `Workflow: ${ctx.currentWorkflow} | Step: ${ctx.currentStep} | Status: ${ctx.workflowStatus} | name: ${ctx.name ?? "-"}`
  );
  console.log(`AI: ${data.reply.slice(0, 120)}${data.reply.length > 120 ? "..." : ""}`);
  return data;
}

function resetSession(language = "en") {
  ctx = {
    conversationId: `conv-${Date.now()}`,
    state: "IDLE",
    currentWorkflow: null,
    workflowStatus: "idle",
    currentStep: "classify",
    intent: null,
    language,
    greeted: true,
    awaitingAnythingElse: false,
    appointmentSaved: false,
  };
  msgs.length = 0;
}

// --- English appointment ---
console.log("\n=== ENGLISH APPOINTMENT ===");
resetSession();
const aptSteps = ["Appointment", "Raja", "9876543210", "Cardiology", "Dr Kumar", "5 August", "10 AM", "No"];
for (const step of aptSteps) await send(step);
if (ctx.state !== "SESSION_CLOSED" && ctx.workflowStatus !== "closed") {
  console.error("\nExpected session closed after appointment");
  process.exit(1);
}
console.log("✓ English appointment passed");

// --- Mixed input, English response ---
console.log("\n=== MIXED INPUT → ENGLISH RESPONSE ===");
resetSession("en");
const mixed = await send("Doctor paakanum");
if (!/name|doctor|appointment|Sure|May I/i.test(mixed.reply)) {
  console.error("Expected English appointment start", mixed.reply);
  process.exit(1);
}
if (TAMIL_SCRIPT.test(mixed.reply)) {
  console.error("English mode must not contain Tamil script");
  process.exit(1);
}
console.log("✓ Mixed input English response passed");

// --- Emergency ---
console.log("\n=== EMERGENCY ===");
resetSession();
await send("Emergency accident on highway");
await send("Kumar");
await send("9123456780");
await send("NH 234 near Thiruvannamalai");
await send("Road accident");
await send("Unconscious and bleeding");
await send("Yes we are travelling");
if (!ctx.referenceId) {
  console.error("Emergency workflow incomplete", ctx);
  process.exit(1);
}
console.log("✓ Emergency passed");

// --- Diagnostic ---
console.log("\n=== DIAGNOSTIC ===");
resetSession();
await send("Scan booking venum");
await send("Priya");
await send("9988776655");
await send("MRI");
await send("12 August");
await send("Thiruvannamalai Unit");
await send("No");
console.log("✓ Diagnostic passed");

// --- FAQ ---
console.log("\n=== FAQ ===");
resetSession();
const faq = await send("What are the visiting hours?");
if (!faq.reply || faq.reply.length < 10) {
  console.error("FAQ response too short");
  process.exit(1);
}
console.log("✓ FAQ passed");

// --- Unknown question ---
console.log("\n=== UNKNOWN QUESTION ===");
resetSession();
const unknown = await send("Do you have a pet grooming service?");
if (!/don't have|connect|hospital team|ennidam illai/i.test(unknown.reply)) {
  console.error("Expected unknown fallback", unknown.reply);
  process.exit(1);
}
console.log("✓ Unknown question passed");

// --- Human transfer ---
console.log("\n=== HUMAN TRANSFER ===");
resetSession();
const esc = await send("Connect me to a human executive");
if (!/GRE|Executive|Connecting|connect/i.test(esc.reply)) {
  console.error("Expected escalation message", esc.reply);
  process.exit(1);
}
console.log("✓ Human transfer passed");

// --- Tamil appointment (Tamil script spellings) ---
console.log("\n=== TAMIL APPOINTMENT SCRIPT ===");
resetSession("ta");
const taApt = await send("அப்பாயின்மென்ட் புக் பண்ணனும்", "ta");
if (ctx.currentWorkflow !== "appointment") {
  console.error("Expected appointment workflow", ctx);
  process.exit(1);
}
console.log("✓ Tamil script appointment passed");

// --- Tamil appointment (Thanglish) ---
console.log("\n=== TAMIL APPOINTMENT ===");
resetSession("ta");
await send("appointment book pannanum", "ta");
await send("Ravi", "ta");
if (ctx.currentWorkflow !== "appointment" || !ctx.name) {
  console.error("Tamil workflow failed", ctx);
  process.exit(1);
}
console.log("✓ Tamil appointment passed");

// --- English input → Tamil response ---
console.log("\n=== ENGLISH INPUT → TAMIL RESPONSE ===");
resetSession("ta");
const taMixed = await send("I need appointment", "ta");
if (!TAMIL_SCRIPT.test(taMixed.reply)) {
  console.error("Expected Tamil script in Tamil mode", taMixed.reply);
  process.exit(1);
}
console.log("✓ English input Tamil response passed");

// --- Context memory ---
console.log("\n=== CONTEXT MEMORY ===");
resetSession();
await send("Appointment");
await send("Meena");
await send("9000000001");
const mid = await send("Cardiology");
if (ctx.name !== "Meena" || ctx.phone !== "9000000001") {
  console.error("Lost collected fields", ctx);
  process.exit(1);
}
if (/name|peru/i.test(mid.reply) && ctx.currentStep !== "ask_name") {
  console.error("Repeated name question", mid.reply);
  process.exit(1);
}
console.log("✓ Context memory passed");

console.log("\n✅ All conversation flows passed");
