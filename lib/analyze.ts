// Runs MediaPipe Pose (Google) in the browser and scores a video against one pose.
// Nothing here sends the video anywhere.

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { PASS_MARK, Point, Pose } from "./poses";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
let clock = 0; // MediaPipe needs frame times that always go up, across all videos

function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const files = await FilesetResolver.forVisionTasks("/mediapipe");
      const make = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })();
  }
  return landmarkerPromise;
}

export type Frame = { t: number; points: Point[] | null };

export type RuleResult = {
  id: string;
  label: string;
  tip: string;
  passRate: number; // % of held frames that passed
  typical: number; // middle value of the measurement
  unit: string;
};

export type Analysis = {
  frames: Frame[];
  score: number; // 0-100
  looksCorrect: boolean;
  rules: RuleResult[];
  worstRule: RuleResult | null; // the rule to coach on (null if all good)
  framesUsed: number;
};

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
  });
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

// Step through the video 8 times a second and find the body points in each frame.
export async function findBodyPoints(
  video: HTMLVideoElement,
  onProgress?: (share: number) => void,
): Promise<Frame[]> {
  const landmarker = await getLandmarker();
  if (video.readyState < 1) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
  const frames: Frame[] = [];
  const step = 1 / 8;
  for (let t = 0; t < video.duration; t += step) {
    await seek(video, t);
    clock += 125;
    const result = landmarker.detectForVideo(video, clock);
    frames.push({ t, points: result.landmarks[0] ?? null });
    onProgress?.(Math.min(1, t / video.duration));
  }
  await seek(video, 0);
  return frames;
}

// Score only the second half of the clip: that is where the pose is held.
export function scoreFrames(frames: Frame[], pose: Pose, aspect: number): Analysis {
  const end = frames.length ? frames[frames.length - 1].t : 0;
  // Turn 0-1 screen positions into true proportions so angles are not squashed.
  const held = frames
    .filter((f) => f.points && f.t >= end / 2)
    .map((f) => f.points!.map((p) => ({ x: p.x * aspect, y: p.y, visibility: p.visibility })));

  const rules: RuleResult[] = pose.rules.map((rule) => {
    const values = held.map((p) => rule.measure(p));
    const passes = held.filter((p, i) => rule.pass(values[i], p)).length;
    return {
      id: rule.id,
      label: rule.label,
      tip: rule.tip,
      passRate: held.length ? Math.round((passes / held.length) * 100) : 0,
      typical: Math.round(median(values)),
      unit: rule.unit,
    };
  });
  const score = rules.length ? Math.round(rules.reduce((s, r) => s + r.passRate, 0) / rules.length) : 0;
  const worst = [...rules].sort((a, b) => a.passRate - b.passRate)[0];
  const looksCorrect = held.length > 0 && score >= PASS_MARK;
  return {
    frames,
    score,
    looksCorrect,
    rules,
    worstRule: looksCorrect || !worst ? null : worst,
    framesUsed: held.length,
  };
}
