// Turns the measured numbers into short, friendly spoken tips with Gemini.
// Gemini receives only numbers and labels — never the video.

import { NextResponse } from "next/server";

const MODEL = "gemini-3.5-flash-lite";

type RuleIn = { label: string; passRate: number; typical: number; unit: string; tip: string };
type Body = { poseName: string; score: number; looksCorrect: boolean; rules: RuleIn[]; count: number };

const PRAISE = "Nice work, that looks right. Breathe slowly and hold it steady.";

function templateTips(body: Body): string[] {
  if (body.looksCorrect) return [PRAISE];
  return [...body.rules]
    .sort((a, b) => a.passRate - b.passRate)
    .filter((r) => r.passRate < 80)
    .slice(0, body.count)
    .map((r) => r.tip);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const count = body.count === 3 ? 3 : 1;
  const fallback = templateTips({ ...body, count });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ tips: fallback, source: "template" });

  const measurements = body.rules
    .map((r) => `- ${r.label}: passed in ${r.passRate}% of frames (typical ${r.typical}${r.unit}). Correct fix: "${r.tip}"`)
    .join("\n");
  const prompt = `You are a calm, friendly yoga helper speaking to a beginner.
Pose: ${body.poseName}. Overall score: ${body.score}% (${body.looksCorrect ? "looks correct" : "needs work"}).
Measured checks:
${measurements}

${body.looksCorrect
    ? "Write 1 short sentence of praise with one gentle cue to keep holding."
    : `Write ${count} tip(s), one per weakest check (lowest % first), only about checks below 80%. Each tip must keep the exact meaning of that check's "Correct fix"; only make the wording warmer.`}
Rules: each tip under 16 words, plain everyday words, say what to do (not what is wrong), no numbers, no medical claims.
Return JSON: {"tips": ["..."]}`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}`);
    const data = await r.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tips: string[] = (JSON.parse(text).tips ?? []).filter((t: unknown) => typeof t === "string" && t.trim());
    if (!tips.length) throw new Error("empty");
    return NextResponse.json({ tips: tips.slice(0, body.looksCorrect ? 1 : count), source: "gemini" });
  } catch {
    return NextResponse.json({ tips: fallback, source: "template" });
  }
}
