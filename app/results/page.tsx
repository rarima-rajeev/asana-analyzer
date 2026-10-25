import evalRows from "@/data/eval.json";
import { POSES } from "@/lib/poses";

export const metadata = { title: "Offline evals: Results & decisions · Asana Analyzer" };

type Row = {
  pose: string; kind: "correct" | "mistake"; score: number; looksCorrect: boolean;
  flaggedRule: string | null; expectedRules: string[] | null; tip: string; tipSource: string;
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
      rightTip: !!wrong && !wrong.looksCorrect && p.mistakeRules.includes(wrong.flaggedRule ?? ""),
    };
  });
  const passed = perPose.filter((x) => x.rightOk).length;
  const caught = perPose.filter((x) => x.rightTip).length;
  const mistakesTested = perPose.filter((x) => x.wrong && !x.wrong.missing).length;

  return (
    <>
      <h1>Offline evals: Results &amp; decisions</h1>
      <p className="lead">What I tested, what I found, and the product choices behind it.</p>
      <p className="muted small">
        * Online evals (checking the scores and tips on real people&apos;s videos) are to be carried out by a yoga practitioner.
        <br />
        * Offline evals: the product&apos;s answers were checked against a fixed answer key by plain code. No AI acted as the judge.
      </p>

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
          <p className="card">
            <b>{passed} of 5</b> good videos marked correct. <b>{caught} of {mistakesTested}</b> mistakes caught with the right tip.
          </p>
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
            Why good videos don&apos;t all score 100%: body points wobble a little from frame to frame (so do real people).
            The 80% bar allows for that. The test videos are AI-generated, so these results show the idea works, not that it works for everyone.
          </p>
        </>
      )}

      <h2>2. Privacy decision</h2>
      <p>
        I chose to analyze the video <b>on the visitor&apos;s device</b>, not in the cloud. Video is never uploaded or saved.
        Only a few numbers, like knee angles, are sent to Gemini to write the tip.
        The trade-off: models that run on a phone are smaller than cloud ones, so they can be less accurate in poor light or at odd camera angles.
        <br /><br />
        I also <b>switched off &quot;use my own video&quot;</b> for this public demo. Even though nothing would be stored, an open upload
        button invites misuse, such as offensive content. It comes back only with safety checks in place.
      </p>

      <h2>3. Limits, said plainly</h2>
      <ul>
        <li>Tested only on 10 AI-made videos, not on real people yet.</li>
        <li>Each pose is checked from one camera angle (front or side). Other angles may confuse it.</li>
        <li>The rules are simple beginner checks, not a yoga teacher&apos;s full judgment.</li>
        <li><b>Not a substitute for a yoga teacher. Stop if it hurts.</b></li>
      </ul>

      <h2>4. What&apos;s next</h2>
      <ul>
        <li>Test with real people of different ages, body types, clothes and rooms.</li>
        <li>Bring back &quot;use my own video&quot;, with safety checks first: block anything that isn&apos;t one person doing a pose, and show only the stick figure.</li>
        <li>Then, only if people use it: more poses and more camera angles.</li>
      </ul>
    </>
  );
}
