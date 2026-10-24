// Development-only: runs all 10 sample clips through the same code visitors use.
// Results are saved to data/eval.json and shown on the Results page.

import { POSES } from "./poses";
import { findBodyPoints, scoreFrames } from "./analyze";

export async function runEval() {
  const rows = [];
  for (const pose of POSES) {
    for (const kind of ["correct", "mistake"] as const) {
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";
      video.src = `/videos/${pose.id}-${kind}.mp4`;
      const loaded = await new Promise<boolean>((r) => {
        video.onloadeddata = () => r(true);
        video.onerror = () => r(false);
      });
      if (!loaded) {
        rows.push({ pose: pose.id, kind, missing: true });
        continue;
      }
      const a = scoreFrames(await findBodyPoints(video), pose, video.videoWidth / video.videoHeight);
      const tip = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poseName: pose.name, score: a.score, looksCorrect: a.looksCorrect, count: 1,
          rules: a.rules,
        }),
      }).then((r) => r.json());
      rows.push({
        pose: pose.id,
        kind,
        score: a.score,
        looksCorrect: a.looksCorrect,
        flaggedRule: a.worstRule?.id ?? null,
        expectedRule: kind === "mistake" ? pose.mistakeRule : null,
        rules: a.rules.map(({ id, passRate, typical, unit }) => ({ id, passRate, typical, unit })),
        tip: tip.tips[0],
        tipSource: tip.source,
        framesUsed: a.framesUsed,
      });
    }
  }
  return rows;
}
