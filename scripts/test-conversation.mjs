const base = "http://localhost:3006/api/chat";
let ctx = null;
const msgs = [];

async function send(text) {
  msgs.push({ role: "user", content: text });
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: msgs,
      language: "en",
      sessionId: "test-flow",
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
  console.log(`\nUser: ${text}`);
  console.log(`State: ${ctx.state} | intent: ${ctx.intent} | name: ${ctx.name ?? "-"}`);
  console.log(`AI: ${data.reply}`);
  if (data.savedLead) console.log(`Saved lead: ${data.savedLead.referenceId}`);
  return data;
}

const steps = [
  "I need an appointment",
  "Raja",
  "9876543210",
  "Cardiology",
  "Dr Kumar",
  "Monday",
  "10 AM",
  "Thank you",
];

for (const step of steps) {
  await send(step);
}

if (ctx.state !== "SESSION_CLOSED") {
  console.error("\nExpected SESSION_CLOSED, got", ctx.state);
  process.exit(1);
}

console.log("\n✓ Full appointment + goodbye flow passed");
