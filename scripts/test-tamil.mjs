const base = "http://localhost:3006/api/chat";
let ctx = { state: "IDLE", intent: null, language: "ta", greeted: false, awaitingAnythingElse: false, appointmentSaved: false };
const msgs = [];

async function send(text) {
  msgs.push({ role: "user", content: text });
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: msgs, language: "ta", sessionId: "test-ta", conversationContext: ctx }),
  });
  const data = await res.json();
  ctx = data.conversationContext;
  msgs.push({ role: "assistant", content: data.reply });
  console.log(`User: ${text} -> State: ${ctx.state}`);
  console.log(`AI: ${data.reply.slice(0, 80)}...`);
}

await send("appointment book pannanum");
await send("Ravi");
console.log(ctx.language === "ta" ? "✓ Tamil language preserved" : "✗ Language lost");
