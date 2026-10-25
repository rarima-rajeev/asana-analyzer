// The 5 poses and their simple, explainable rules.
// Each rule looks at body points from MediaPipe Pose and answers yes / no for one video frame.

export type Point = { x: number; y: number; visibility?: number };

// MediaPipe Pose body-point numbers we use.
const NOSE = 0, L_SHOULDER = 11, R_SHOULDER = 12, L_ELBOW = 13, R_ELBOW = 14,
  L_WRIST = 15, R_WRIST = 16, L_HIP = 23, R_HIP = 24, L_KNEE = 25, R_KNEE = 26,
  L_ANKLE = 27, R_ANKLE = 28, L_HEEL = 29, R_HEEL = 30, L_TOE = 31, R_TOE = 32;

// Angle at point b (in degrees) made by a-b-c. 180 = straight line.
function angle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// How far a line leans away from straight up (0 = upright).
function leanFromVertical(bottom: Point, top: Point): number {
  return (Math.atan2(Math.abs(top.x - bottom.x), Math.abs(bottom.y - top.y)) * 180) / Math.PI;
}

// How far a line tilts away from flat (0 = level).
function tiltFromFlat(a: Point, b: Point): number {
  return (Math.atan2(Math.abs(a.y - b.y), Math.abs(a.x - b.x)) * 180) / Math.PI;
}

const kneeL = (p: Point[]) => angle(p[L_HIP], p[L_KNEE], p[L_ANKLE]);
const kneeR = (p: Point[]) => angle(p[R_HIP], p[R_KNEE], p[R_ANKLE]);
const elbowL = (p: Point[]) => angle(p[L_SHOULDER], p[L_ELBOW], p[L_WRIST]);
const elbowR = (p: Point[]) => angle(p[R_SHOULDER], p[R_ELBOW], p[R_WRIST]);
const bodyLean = (p: Point[]) =>
  leanFromVertical(mid(p[L_HIP], p[R_HIP]), mid(p[L_SHOULDER], p[R_SHOULDER]));
const torsoLength = (p: Point[]) =>
  Math.hypot(...(() => {
    const s = mid(p[L_SHOULDER], p[R_SHOULDER]), h = mid(p[L_HIP], p[R_HIP]);
    return [s.x - h.x, s.y - h.y];
  })());

// How high the hands are above the nose, as a share of torso length.
const handsAboveHead = (p: Point[]) =>
  Math.round(((p[NOSE].y - Math.min(p[L_WRIST].y, p[R_WRIST].y)) / (torsoLength(p) || 1)) * 100);

// In a side view, one side of the body is hidden. Use the side the camera sees best.
function seenSide(p: Point[]): "L" | "R" {
  const vis = (i: number) => p[i].visibility ?? 1;
  const l = vis(L_SHOULDER) + vis(L_ELBOW) + vis(L_KNEE) + vis(L_ANKLE);
  const r = vis(R_SHOULDER) + vis(R_ELBOW) + vis(R_KNEE) + vis(R_ANKLE);
  return l >= r ? "L" : "R";
}

export type Rule = {
  id: string;
  label: string; // shown on screen: what we check, in plain words
  tip: string; // fallback tip if this rule fails most
  measure: (p: Point[]) => number; // the number we look at
  unit: string;
  pass: (value: number, p: Point[]) => boolean;
};

export type Pose = {
  id: string;
  name: string;
  view: "front" | "side";
  howTo: string;
  mistake: string; // the common mistake shown in the sample clip
  mistakeRules: string[]; // which rule(s) that mistake should break
  rules: Rule[];
};

export const POSES: Pose[] = [
  {
    id: "mountain",
    name: "Mountain",
    view: "side",
    howTo: "Parvatasana: palms and feet on the floor, heels down, hips high, body in an inverted V.",
    mistake: "Knees bent, heels lifted",
    mistakeRules: ["legs", "heels"],
    rules: [
      {
        id: "hips",
        label: "Hips lifted high, body in an upside-down V",
        tip: "Lift your hips up and back, making a tall upside-down V.",
        measure: (p) => {
          const [s, h, a] = seenSide(p) === "L" ? [p[L_SHOULDER], p[L_HIP], p[L_ANKLE]] : [p[R_SHOULDER], p[R_HIP], p[R_ANKLE]];
          return angle(s, h, a);
        },
        unit: "° at the hips",
        pass: (v, p) => v <= 110 && mid(p[L_HIP], p[R_HIP]).y < mid(p[L_SHOULDER], p[R_SHOULDER]).y,
      },
      {
        id: "arms",
        label: "Arms straight",
        tip: "Straighten your arms and press your palms into the floor.",
        measure: (p) => (seenSide(p) === "L" ? elbowL(p) : elbowR(p)),
        unit: "° elbow angle",
        pass: (v) => v >= 150,
      },
      {
        id: "legs",
        label: "Legs straight",
        tip: "Straighten your legs and gently press your heels toward the floor.",
        measure: (p) => (seenSide(p) === "L" ? kneeL(p) : kneeR(p)),
        unit: "° knee angle",
        pass: (v) => v >= 155,
      },
      {
        id: "heels",
        label: "Heels down on the floor",
        tip: "Lower your heels and press them gently into the floor.",
        // Heel height above the toes, as a share of torso length (same measure as Palm Tree's tiptoes).
        measure: (p) => {
          const [heel, toe] = seenSide(p) === "L" ? [p[L_HEEL], p[L_TOE]] : [p[R_HEEL], p[R_TOE]];
          return Math.round(((toe.y - heel.y) / (torsoLength(p) || 1)) * 100);
        },
        unit: "% heel lift",
        pass: (v) => v <= 6,
      },
    ],
  },
  {
    id: "palmtree",
    name: "Palm Tree",
    view: "side",
    howTo: "Rise onto your tiptoes, fingers locked, palms up, arms stretched overhead.",
    mistake: "Elbows bent, arms not reaching up",
    mistakeRules: ["arms"],
    rules: [
      {
        id: "arms",
        label: "Arms reaching high above the head",
        tip: "Straighten your elbows and reach your palms up to the sky.",
        // From the side, a bent elbow can look straight, so we check how high the hands reach instead.
        measure: handsAboveHead,
        unit: "% hands above head",
        pass: (v) => v >= 45,
      },
      {
        id: "tiptoes",
        label: "Up on tiptoes, heels lifted",
        tip: "Lift your heels and rise up onto your toes.",
        // Heel height above the toes, as a share of torso length.
        measure: (p) => {
          const [heel, toe] = seenSide(p) === "L" ? [p[L_HEEL], p[L_TOE]] : [p[R_HEEL], p[R_TOE]];
          return Math.round(((toe.y - heel.y) / (torsoLength(p) || 1)) * 100);
        },
        unit: "% heel lift",
        pass: (v) => v >= 8,
      },
      {
        id: "straight",
        label: "Body in one straight line",
        tip: "Keep your body in one tall line from heels to hands.",
        measure: bodyLean,
        unit: "° lean",
        pass: (v) => v <= 12,
      },
    ],
  },
  {
    id: "warrior2",
    name: "Warrior II",
    view: "front",
    howTo: "Wide stance, front knee bent, back leg straight, arms out level.",
    mistake: "Front knee barely bent",
    mistakeRules: ["frontKnee"],
    rules: [
      {
        id: "frontKnee",
        label: "Front knee clearly bent",
        tip: "Bend your front knee more, so it sits over your ankle.",
        measure: (p) => Math.min(kneeL(p), kneeR(p)),
        unit: "° front knee",
        pass: (v) => v <= 140,
      },
      {
        id: "backLeg",
        label: "Back leg straight",
        tip: "Keep your back leg straight and strong.",
        measure: (p) => Math.max(kneeL(p), kneeR(p)),
        unit: "° back knee",
        pass: (v) => v >= 155,
      },
      {
        id: "arms",
        label: "Arms out straight at shoulder height",
        tip: "Lift your arms to shoulder height and reach out through your fingertips.",
        measure: (p) => Math.max(
          tiltFromFlat(p[L_SHOULDER], p[L_WRIST]), tiltFromFlat(p[R_SHOULDER], p[R_WRIST])),
        unit: "° off level",
        pass: (v, p) => v <= 15 && elbowL(p) >= 150 && elbowR(p) >= 150,
      },
    ],
  },
  {
    id: "chair",
    name: "Chair",
    view: "side",
    howTo: "Feet together, bend your knees as if sitting back, arms up.",
    mistake: "Knees barely bent",
    mistakeRules: ["knees"],
    rules: [
      {
        id: "knees",
        label: "Knees clearly bent, like sitting",
        tip: "Sit back and lower your hips, as if into a chair.",
        measure: (p) => (seenSide(p) === "L" ? kneeL(p) : kneeR(p)),
        unit: "° knee angle",
        pass: (v) => v <= 130,
      },
      {
        id: "arms",
        label: "Arms raised overhead",
        tip: "Reach your arms up alongside your ears.",
        measure: handsAboveHead,
        unit: "% hands above head",
        pass: (v) => v >= 10,
      },
    ],
  },
  {
    id: "triangle",
    name: "Triangle",
    view: "front",
    howTo: "Wide stance, both legs straight, lean sideways, arms in one line.",
    mistake: "Front knee bent",
    mistakeRules: ["legs"],
    rules: [
      {
        id: "legs",
        label: "Both legs straight",
        tip: "Straighten your front leg, keeping a soft knee.",
        measure: (p) => Math.min(kneeL(p), kneeR(p)),
        unit: "° knee angle",
        pass: (v) => v >= 160,
      },
      {
        id: "arms",
        label: "Arms in one straight line",
        tip: "Stretch your arms into one long line, top hand to the sky.",
        measure: (p) => angle(p[L_WRIST], mid(p[L_SHOULDER], p[R_SHOULDER]), p[R_WRIST]),
        unit: "° between arms",
        pass: (v) => v >= 150,
      },
      {
        id: "lean",
        label: "Upper body tipped sideways",
        tip: "Reach forward, then tip your upper body sideways over your front leg.",
        measure: bodyLean,
        unit: "° sideways",
        pass: (v) => v >= 25,
      },
    ],
  },
];

export const PASS_MARK = 80; // score at or above this = "Looks correct"
