// Turns the measured numbers into short, friendly spoken tips with Gemini.
// Gemini receives only numbers and labels — never the video.

import { NextResponse } from "next/server";
import { checkTip } from "@/lib/tipCheck";

const MODEL = "gemini-3.5-flash-lite";

type RuleIn = { id: string; label: string; passRate: number; typical: number; unit: string; tip: string };
type Body = { poseName: string; score: number; looksCorrect: boolean; rules: RuleIn[]; count: number };

const PRAISE = "Nice work, that looks right. Breathe slowly and hold it steady.";

// The checks to coach on, weakest first (the same order Gemini is asked to follow).
function weakRules(body: Body): RuleIn[] {
  return [...body.rules]
    .sort((a, b) => a.passRate - b.passRate)
    .filter((r) => r.passRate < 80)
    .slice(0, body.count);
}

function templateTips(body: Body): string[] {
  return body.looksCorrect ? [PRAISE] : weakRules(body).map((r) => r.tip);
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

    // Guardrail: check each tip; swap any that fail for the ready-made tip.
    const targets = body.looksCorrect ? [null] : weakRules({ ...body, count });
    let replaced = 0;
    const checked = targets.map((rule, i) => {
      const tip = tips[i];
      const result = tip ? checkTip(tip, rule ? `${body.poseName}:${rule.id}` : null) : { ok: false as const, reason: "missing" };
      if (result.ok) return tip;
      replaced += 1;
      console.warn(`[tip guardrail] ${body.poseName}: replaced "${tip ?? ""}" (${result.reason})`);
      return rule ? rule.tip : PRAISE;
    });
    return NextResponse.json({
      tips: checked,
      source: replaced === 0 ? "gemini" : replaced === checked.length ? "template (guardrail)" : "gemini + template (guardrail)",
    });
  } catch {
    return NextResponse.json({ tips: fallback, source: "template" });
  }
}
