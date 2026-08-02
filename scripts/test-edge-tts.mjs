import { EdgeTTS } from "edge-tts-universal";

const text = "வணக்கம். என்ன ஹெல்ப் வேண்டும்?";
const tts = new EdgeTTS(text, "ta-IN-PallaviNeural", { rate: "-5%" });
const result = await tts.synthesize();
const buf = Buffer.from(await result.audio.arrayBuffer());
console.log("Tamil audio bytes:", buf.length);
