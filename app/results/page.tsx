import evalRows from "@/data/eval.json";
import { POSES } from "@/lib/poses";

export const metadata = { title: "Results & decisions · Asana Analyzer" };

type Row = {
  pose: string; kind: "correct" | "mistake"; score: number; looksCorrect: boolean;
  flaggedRule: string | null; expectedRule: string | null; tip: string; tipSource: string;
  missing?: boolean;
};

const rows = evalRows as unknown as Row[];

function Yes({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={ok ? "pill yes" : "pill no"}>{children}</span>;
}

export default function Results() {
  const perPose = POSES.map((p) => {
    const right = rows.find((r) => r.pose === p.id && r.kind === "correct");
    const wrong = rows.find((r) => r.pose === p.id && r.kind === "mistake");
    return {
      pose: p,
      right,
      wrong,
      rightOk: !!right?.looksCorrect,
      caught: !!wrong && !wrong.looksCorrect,
      rightTip: !!wrong && !wrong.looksCorrect && wrong.flaggedRule === p.mistakeRule,
    };
  });
  const passed = perPose.filter((x) => x.rightOk).length;
  const caught = perPose.filter((x) => x.rightTip).length;
  const mistakesTested = perPose.filter((x) => x.wrong && !x.wrong.missing).length;

  return (
    <>
      <h1>Results &amp; decisions</h1>
      <p className="lead">What I tested, what I found, and the product choices behind it.</p>

      <h2>1. Does it work?</h2>
      <p>
        I made short test videos with AI: each of the 5 poses done right, and done with one common mistake.
        For each pose I asked two questions: does it say <b>&quot;correct&quot;</b> for the good video, and does it
        <b> catch the mistake with the right tip</b>?
      </p>
      {rows.length === 0 ? (
        <p className="card">Test not run yet.</p>
      ) : (
        <>
          <div className="card">
            <p style={{ marginTop: 0 }}>
              <b>First try</b> (rules written before testing): 5 of 5 good videos marked correct. Only 2 of 4 mistakes caught.
            </p>
            <p>
              <b>What went wrong:</b> for Palm Tree, filmed from the side, bent elbows still looked almost straight. So I switched
              to checking how high the hands reach. For Chair, my &quot;knees bent&quot; limit was too loose by 1 degree, so I tightened it.
            </p>
            <p style={{ marginBottom: 0 }}>
              <b>Second try:</b> {passed} of 5 good videos marked correct. {caught} of {mistakesTested} mistakes caught with the right tip.
              Honest caveat: I fixed the rules using these same videos, so the second score is flattering. Fresh videos are needed to confirm it.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pose</th>
                  <th>Good video: said &quot;correct&quot;?</th>
                  <th>Mistake video: caught with the right tip?</th>
                  <th>Tip it gave on the mistake video</th>
                </tr>
              </thead>
              <tbody>
                {perPose.map((x) => (
                  <tr key={x.pose.id}>
                    <td><b>{x.pose.name}</b><br /><span className="muted small">Mistake: {x.pose.mistake.toLowerCase()}</span></td>
                    <td><Yes ok={x.rightOk}>{x.rightOk ? "Yes" : "No"}</Yes> <span className="muted small">{x.right?.score}%</span></td>
                    {x.wrong?.missing ? (
                      <td colSpan={2} className="muted small">Not tested: this video could not be made (budget limit reached).</td>
                    ) : (
                      <>
                        <td><Yes ok={x.rightTip}>{x.rightTip ? "Yes" : x.caught ? "Caught, wrong tip" : "No"}</Yes> <span className="muted small">{x.wrong?.score}%</span></td>
                        <td className="small">&ldquo;{x.wrong?.tip}&rdquo;</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            Score = how much of the held pose passed each check. 80% or more counts as &quot;correct&quot;.
            The test videos are AI-generated, so these results show the idea works, not that it works for everyone.
          </p>
        </>
      )}

      <h2>2. What counts as success: the activation metric</h2>
      <p>
        <b>Activation</b> (the moment a new visitor first gets real value) = the visitor <b>gets their first score and hears a tip</b>.
        The follow-up signal I care most about is <b>trying again</b> after the tip. That shows the tip was useful enough to act on.
      </p>

      <h2>3. A/B test: 1 tip or 3 tips?</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><th>Question</th><td>Do people improve more with one tip, or with three?</td></tr>
            <tr><th>My guess</th><td>One tip is easier to act on mid-pose, so more people will try again.</td></tr>
            <tr><th>Split</th><td>Half of visitors hear 1 tip, half hear up to 3. Each visitor always stays in the same group.</td></tr>
            <tr><th>Main measure</th><td>Try-again rate: the share of people who run a second video after hearing the tip.</td></tr>
            <tr><th>Safety checks</th><td>Do people listen to the end? Does the tip arrive quickly?</td></tr>
            <tr><th>When to stop</th><td>After 2 weeks or about 400 visitors per group, whichever comes first.</td></tr>
            <tr><th>Status</th><td>Designed and wired into the code. The live split will be switched on with PostHog (a product analytics tool). Until then, everyone hears 1 tip.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>4. Privacy decision</h2>
      <p>
        I chose to analyze the video <b>on the visitor&apos;s device</b>. The video is never uploaded or saved. For your own video, the screen
        shows only a stick figure. Only a few numbers, like knee angles, are sent to Gemini to write the tip.
        The trade-off: phone-side models are smaller than cloud ones, so they can be less accurate in poor light or odd camera angles.
      </p>

      <h2>5. Limits, said plainly</h2>
      <ul>
        <li>Tested only on 9 AI-made videos, not on real people yet. The 10th (Triangle with a bent knee) wasn&apos;t made: the monthly AI budget cap was reached first.</li>
        <li>During this test, the tips came from the ready-made fallback, not Gemini, because the same budget cap paused Gemini. The fallback is the safety net that keeps the product working when the AI doesn&apos;t.</li>
        <li>Each pose is checked from one camera angle (front or side). Other angles may confuse it.</li>
        <li>The rules are simple beginner checks I wrote as a product manager, not a yoga teacher&apos;s full judgment.</li>
        <li>The video-making AI sometimes does not show the exact mistake it was asked for. Where that happened, the table above shows it.</li>
        <li><b>Not a substitute for a yoga teacher. Stop if it hurts.</b></li>
      </ul>

      <h2>6. What&apos;s next</h2>
      <ul>
        <li>Test with real people of different ages, body types, clothes and rooms.</li>
        <li>Switch on the live 1-tip vs 3-tip test.</li>
        <li>Then, only if people use it: more poses and more camera angles.</li>
      </ul>
    </>
  );
}
