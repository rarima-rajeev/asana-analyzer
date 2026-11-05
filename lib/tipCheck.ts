// Guardrail: check every Gemini tip before it reaches the screen.
// If a tip fails any check, the ready-made tip for that rule is shown instead,
// so the worst case is a plain correct tip, never a made-up one.

const MAX_WORDS = 18;

// Words that turn a movement cue into medical advice or a promise. Never allowed.
const RISKY = ["pain", "hurt", "injur", "doctor", "cure", "heal", "diagnos", "therap", "medic", "treat", "disease", "surgery", "safe for"];

// What a tip for each check must mention: one word from EACH group.
// Group 1 = the body part, group 2 = the direction of the fix.
// Example: Triangle legs must say "leg/knee" AND "straight", which blocks
// the real mistake Gemini once made ("keep your front knee soft").
const MUST_SAY: Record<string, string[][]> = {
  "Mountain:hips": [["hip"], ["lift", "up", "high", "raise"]],
  "Mountain:arms": [["arm", "elbow", "palm", "hand"], ["straight", "press"]],
  "Mountain:legs": [["leg", "knee"], ["straight"]],
  "Mountain:heels": [["heel"], ["lower", "down", "floor", "press"]],
  "Palm Tree:arms": [["arm", "elbow", "palm", "hand"], ["straight", "reach", "up", "high", "sky"]],
  "Palm Tree:tiptoes": [["heel", "toe"], ["lift", "rise", "up"]],
  "Palm Tree:straight": [["body", "line", "tall"], ["straight", "line", "tall"]],
  "Warrior II:frontKnee": [["knee"], ["bend", "deeper", "lower"]],
  "Warrior II:backLeg": [["leg", "knee"], ["straight", "strong"]],
  "Warrior II:arms": [["arm", "hand", "finger", "shoulder"], ["lift", "level", "reach", "out", "straight"]],
  "Chair:knees": [["knee", "hip"], ["bend", "lower", "sit", "sink", "down"]],
  "Chair:arms": [["arm", "hand"], ["reach", "up", "raise", "lift"]],
  "Triangle:legs": [["leg", "knee"], ["straight"]],
  "Triangle:arms": [["arm", "hand"], ["line", "stretch", "reach", "straight"]],
  "Triangle:lean": [["body", "torso", "side", "chest", "waist"], ["tip", "lean", "side", "reach", "tilt"]],
};

// True if the text has a word starting with `stem` ("straight" matches "straighten").
const hasWord = (text: string, stem: string) => new RegExp(`\\b${stem}`, "i").test(text);

export type TipCheck = { ok: true } | { ok: false; reason: string };

// `ruleKey` is "Pose:ruleId" for a fix tip, or null for a praise tip.
export function checkTip(tip: string, ruleKey: string | null): TipCheck {
  const words = tip.trim().split(/\s+/).length;
  if (words > MAX_WORDS) return { ok: false, reason: `too long (${words} words)` };
  if (/\d/.test(tip)) return { ok: false, reason: "contains a number" };
  const risky = RISKY.find((w) => hasWord(tip, w));
  if (risky) return { ok: false, reason: `risky word "${risky}"` };
  const groups = ruleKey ? MUST_SAY[ruleKey] : undefined;
  if (groups) {
    for (const group of groups) {
      if (!group.some((w) => hasWord(tip, w))) return { ok: false, reason: `doesn't say ${group.join("/")}` };
    }
  }
  return { ok: true };
}
