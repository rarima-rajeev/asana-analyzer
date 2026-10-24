"use client";

import { useEffect, useRef, useState } from "react";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSES, Pose } from "@/lib/poses";
import { Analysis, Frame, findBodyPoints, scoreFrames } from "@/lib/analyze";
import { tipCount, track } from "@/lib/experiment";

type Source = { kind: "correct" | "mistake"; url: string };

async function getTips(pose: Pose, a: Analysis, count: number): Promise<{ tips: string[]; source: string }> {
  const tipsByRule = Object.fromEntries(pose.rules.map((r) => [r.id, r.tip]));
  const r = await fetch("/api/tip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      poseName: pose.name,
      score: a.score,
      looksCorrect: a.looksCorrect,
      count,
      rules: a.rules.map((x) => ({ ...x, tip: tipsByRule[x.id] })),
    }),
  });
  return r.json();
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function drawSkeleton(canvas: HTMLCanvasElement, frame: Frame | undefined) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!frame?.points) return;
  const pts = frame.points.map((p) => ({ ...p, z: 0, visibility: p.visibility ?? 1 }));
  const draw = new DrawingUtils(ctx);
  draw.drawConnectors(pts, PoseLandmarker.POSE_CONNECTIONS, { color: "#FFD84D", lineWidth: 4 });
  draw.drawLandmarks(pts, { color: "#ffffff", fillColor: "#7b2869", radius: 4 });
}

export default function TryIt() {
  const [pose, setPose] = useState<Pose>(POSES[0]);
  const [source, setSource] = useState<Source | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runs = useRef(0);
  const tipCutOff = useRef(false); // the spoken tip was stopped by Pause

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    import("@/lib/evalRunner").then((m) => {
      (window as unknown as { __runEval: typeof m.runEval }).__runEval = m.runEval;
    });
  }, []);

  // Run the analysis whenever a new video is chosen.
  useEffect(() => {
    if (!source || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setAnalysis(null);
        setTips([]);
        setProgress(0);
        track(runs.current === 0 ? "analysis_started" : "tried_again", { pose: pose.id, video: source.kind });
        runs.current += 1;
        const frames = await findBodyPoints(video, (s) => !cancelled && setProgress(s));
        if (cancelled) return;
        const a = scoreFrames(frames, pose, video.videoWidth / video.videoHeight);
        setProgress(null);
        if (!a.framesUsed) {
          setError("We couldn't find a whole body in this video. Try one where you are fully in view.");
          return;
        }
        setAnalysis(a);
        track("first_score_shown", { pose: pose.id, score: a.score });
        video.play().catch(() => {});
        const t = await getTips(pose, a, tipCount());
        if (cancelled) return;
        setTips(t.tips);
        speak(t.tips.join(" "));
      } catch {
        setProgress(null);
        setError("Something went wrong while reading the video. Please try another one.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, pose]);

  // Draw the stick figure in step with the video.
  useEffect(() => {
    if (!analysis) return;
    let raf = 0;
    const loop = () => {
      const v = videoRef.current, c = canvasRef.current;
      if (v && c) {
        if (c.width !== v.videoWidth) {
          c.width = v.videoWidth;
          c.height = v.videoHeight;
        }
        const frame = analysis.frames.reduce((best, f) =>
          Math.abs(f.t - v.currentTime) < Math.abs(best.t - v.currentTime) ? f : best, analysis.frames[0]);
        drawSkeleton(c, frame);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [analysis]);

  function pickPose(p: Pose) {
    setPose(p);
    setSource(null);
    setAnalysis(null);
    setTips([]);
  }

  function pickSample(kind: "correct" | "mistake") {
    setSource({ kind, url: `/videos/${pose.id}-${kind}.mp4` });
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  return (
    <div className="tryit">
      <section>
        <h2>1. Pick a pose</h2>
        <div className="chips">
          {POSES.map((p) => (
            <button key={p.id} className={p.id === pose.id ? "chip on" : "chip"} onClick={() => pickPose(p)}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="muted">
          <strong>{pose.name}:</strong> {pose.howTo} Seen from the {pose.view}.
        </p>
      </section>

      <section>
        <h2>2. Pick a video</h2>
        <div className="chips">
          <button className={source?.kind === "correct" ? "chip on" : "chip"} onClick={() => pickSample("correct")}>
            Sample: done right
          </button>
          <button className={source?.kind === "mistake" ? "chip on" : "chip"} onClick={() => pickSample("mistake")}>
            Sample: common mistake
          </button>
          <button className="chip" disabled>
            Use my own video (coming later)
          </button>
        </div>
        <p className="muted small">
          Sample videos are AI-generated (Google Gemini Omni Flash). Common mistake shown: {pose.mistake.toLowerCase()}.
          <br />
          Using your own video is switched off for now. It will come back once there are safety checks in place.
        </p>
      </section>

      {source && (
        <section className="stage-wrap">
          <div className="stage">
            <video
              key={source.url}
              ref={videoRef}
              src={source.url}
              muted
              playsInline
              loop
              preload="auto"
              onPlay={() => {
                setPlaying(true);
                // Pick up the tip again if Pause cut it off (browsers can't resume speech mid-sentence reliably).
                if (tipCutOff.current && tips.length) speak(tips.join(" "));
                tipCutOff.current = false;
              }}
              onPause={() => {
                setPlaying(false);
                if (window.speechSynthesis?.speaking) {
                  window.speechSynthesis.cancel();
                  tipCutOff.current = true;
                }
              }}
              onClick={togglePlay}
            />
            <canvas ref={canvasRef} onClick={togglePlay} />
            {analysis && (
              <div className="controls">
                <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                  {playing ? "❚❚" : "▶"}
                </button>
                <span>{playing ? "Pause" : "Play"}</span>
              </div>
            )}
            {progress !== null && (
              <div className="overlay">Finding body points… {Math.round(progress * 100)}%</div>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          {analysis && (
            <div className="result">
              <div className={analysis.looksCorrect ? "score good" : "score warn"}>
                {analysis.score}% correct
                <span>{analysis.looksCorrect ? "Looks correct" : "Needs a small fix"}</span>
              </div>
              <div className="tip">
                <strong>{tips.length > 1 ? "Tips" : "Tip"}:</strong>{" "}
                {tips.length ? tips.join(" ") : "Writing your tip…"}
                {tips.length > 0 && (
                  <button className="link" onClick={() => speak(tips.join(" "))}>
                    🔊 Hear tip again
                  </button>
                )}
              </div>
              <details>
                <summary>What we checked</summary>
                <ul className="checks">
                  {analysis.rules.map((r) => (
                    <li key={r.id}>
                      {r.passRate >= 80 ? "✅" : "⚠️"} {r.label}: held in {r.passRate}% of the time
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
