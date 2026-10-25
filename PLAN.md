# Asana Analyzer — Plan

> **Status 2026-10-24:** built and working locally. Decisions A, B, C approved by the user. Tree was swapped for **Palm Tree** at the user's request. 9 of 10 clips were made; the 10th (Triangle mistake) was blocked by the AI Studio monthly spend cap. The site is the source of truth for wording now.

**Headline AI PM skill:** multimodal (video in → pose numbers → spoken tip).
**Supporting:** on-device vs cloud trade-off, voice output, activation metric, A/B test design.

## ⚠️ 3 decisions for you
| # | Question | My recommendation |
|---|---|---|
| A | **Veo was shut down in the Gemini API on 22 Oct 2026.** Google's replacement on your same key is **Gemini Omni Flash** (`gemini-omni-1.1-flash`), ≈ $0.10 per second at 720p (≈ ₹9/s). 10 clips × 8 s ≈ ₹710, which is **over** the ₹600 cap. | Use Omni Flash. Make **1 test clip first** (≈ ₹50–70) to learn the real length and cost. Then pick: **720p with ~5 s clips** (≈ ₹450 + retries) or **360p** (cheaper; MediaPipe works fine on it). Stop if the total would pass ₹600. |
| B | **ffmpeg isn't installed.** I need it to pull still frames from each clip so I can check for glitches. | Install the Python package `imageio-ffmpeg` into a private project folder (`.venv`). It is **not** brew, and it does not touch Node or anything system-wide. |
| C | For **your own uploaded video**, the brief says "show only the skeleton". Does that mean (1) show the stick figure instead of your real video, but still give a score and tip, or (2) stick figure only, with no score and no tip? | (1): stick figure on a plain background, plus score and tip. Only the angle numbers go to Gemini, never the video. |

**Tip model:** `gemini-3.5-flash-lite` (stable, fastest, cost ≈ ₹0). If Gemini fails, a fixed template tip is used instead.

---

## The 5 poses: what we check (plain rules on joint angles)
| Pose | Camera view | "Correct" means | Common mistake (in the mistake clip) | Fallback tip (spoken) |
|---|---|---|---|---|
| Mountain | front | Body straight up; shoulders level | Leaning to one side | "Stand tall. Stack your shoulders over your hips." |
| Palm Tree | side | On tiptoes, heels lifted; hands reaching high above the head; body in one line | Elbows bent, hands resting near the head | "Straighten your elbows and reach your palms up to the sky." |
| Warrior II | front | Front knee bent to about a right angle; arms level at shoulder height | Front knee barely bent | "Bend your front knee more, over your ankle." |
| Chair | side | Knees clearly bent (like sitting); chest lifted | Knees barely bent, standing too tall | "Sit back and lower your hips, like into a chair." |
| Triangle | front | Both legs straight; arms in one line | Front knee bent | "Straighten your front leg, with a soft knee." |

**Score** = the share of video frames where the pose passes each rule, averaged across the rules. Example: "85% correct". **≥ 80% = "Looks correct"**.

---

## Page 1 — Try it
- **Title:** Asana Analyzer
- **Tagline:** Am I doing this pose correctly?
- **Intro:** Pick a yoga pose. Play a sample video or use your own. You'll see a stick figure, a score, and hear one tip.
- **Step 1 — Pick a pose:** [Mountain] [Tree] [Warrior II] [Chair] [Triangle]
- **Step 2 — Pick a video:** [Sample: done right] [Sample: common mistake] [Use my own video]
  - Under the upload button: *Your video stays on your device. It is never uploaded or saved.*
  - Under the samples: *Sample videos are AI-generated (Google Gemini Omni Flash).*
- **Result:** **85% correct** · **Tip:** "…" · [🔊 Hear tip again]
- **Footer (every page):** *Not a substitute for a yoga teacher. Stop if it hurts.*

## Page 2 — How it works
**Diagram (one picture):**
`Your video → [IN YOUR BROWSER: MediaPipe Pose finds 33 body points → angle rules → score] → only a few numbers → [GOOGLE GEMINI: turns numbers into one short, friendly tip] → [IN YOUR BROWSER: speaks the tip aloud]`

| What | Where it runs | Why |
|---|---|---|
| Finding body points (MediaPipe Pose, Google) | Your browser | **Privacy:** the video never leaves your device. **Speed:** no upload wait. **Cost:** free. |
| Scoring (angle rules) | Your browser | Simple and explainable: every score can be traced to a rule. |
| Writing the tip (Gemini) | Google's cloud | It turns numbers into friendly words. It gets only angles, so it is cheap and private. |
| Speaking the tip | Your browser (built-in voice) | Free and instant, with no audio files. |

## Page 3 — Results & decisions
1. **Does it work? (eval):** 10 AI-made clips: 5 poses × (done right + common mistake). For each pose: did it say "correct" on the right clip, and did it catch the mistake with the right tip? I fill in the table honestly after running it, including misses.
2. **Activation metric:** % of visitors who get their **first score and tip** in the session. North-star follow-up: % who **try again** after hearing the tip.
3. **A/B test design: 1 tip vs 3 tips.** *Hypothesis:* one tip is easier to act on, so more people try again. *Split:* 50/50 by visitor. *Primary metric:* try-again rate. *Guardrails:* finish rate (tip heard to the end) and time to tip. *Stop rule:* 2 weeks or ~400 visitors per group. (The live split uses a PostHog feature flag and is switched on later. Until then, everyone gets 1 tip.)
4. **Privacy decision:** analysis runs on the device; only angle numbers go to Gemini; nothing is stored.
5. **Limits:** tested only on AI-made videos; one camera angle per pose; a loose 2D estimate, not medical advice. *Not a substitute for a yoga teacher. Stop if it hurts.*
6. **What's next:** test with real people of different body types and rooms; add more poses; live A/B test.

---

## The 10 video prompts
**Shared ending (added to every prompt):** *"One adult, fully clothed in loose, plain, solid-color yoga clothes (long pants, t-shirt). Plain light-grey studio wall, plain floor, soft even light. Whole body in frame, head to feet, static camera at hip height. The person moves into the pose and holds it still. About 5 seconds. No text, logos, brands or mirrors. Calm and neutral, nothing revealing. No dialogue, no music."*

| # | Clip | Prompt start |
|---|---|---|
| 1 | Mountain ✅ | Front view. A person stands upright in yoga mountain pose: feet together, arms by the sides, shoulders level, body perfectly straight. |
| 2 | Mountain ❌ | Front view. A person stands in mountain pose but leans clearly to their right side, so the shoulders are tilted and the body is not straight. |
| 3–4 | Palm Tree ✅ / ❌ | See `scripts/make_videos.py` (side view, on tiptoes, fingers interlocked; mistake = elbows bent). |
| 5 | Warrior II ✅ | Front view. A person in warrior two pose: wide stance, front knee bent to a right angle over the ankle, back leg straight, arms stretched out level at shoulder height. |
| 6 | Warrior II ❌ | Front view. A person in warrior two pose with a wide stance and arms out level, but the front knee is only slightly bent, almost straight. |
| 7 | Chair ✅ | Side view. A person in chair pose: feet together, knees deeply bent as if sitting on a chair, hips back, arms raised overhead. |
| 8 | Chair ❌ | Side view. A person in chair pose with arms raised overhead but knees only slightly bent, standing almost straight. |
| 9 | Triangle ✅ | Front view. A person in triangle pose: wide stance, both legs straight, leaning sideways with the lower hand at the shin and the upper arm pointing straight up. |
| 10 | Triangle ❌ | Front view. A person in triangle pose with a wide stance and arms in one vertical line, but the front knee is clearly bent. |

**Check after generating:** I pull frames from every clip and look at them myself. A glitchy clip (extra limbs, warping, body cut off) gets **at most 1 redo**. If the model "fixes" a mistake on its own, I report that honestly.

## Scope guard
Exactly 3 pages. Not now: GitHub, deploy, live PostHog split (a no-op hook only). **Later list:** more poses, side + front views, rep counting, other languages for the voice.

## Later: growing it into a real product (ideas only, not building now)
| Step | What | Why |
|---|---|---|
| 1. Validate | 5–10 real people try a **live camera** version (coaching while you hold the pose) | Proves accuracy on real bodies and rooms; measures try-again rate |
| 2. More poses | 10–15 more poses, rules checked by a certified yoga teacher | Each pose needs its own rules; expert backing keeps tips safe |
| 3. Muscle map | Simple **2D body map** highlighting muscles each pose works (3D only if users ask) | Most of the value of 3D at a fraction of the effort; anatomy content must be expert-checked |
| 4. MCP | "Yoga knowledge" MCP tools for AI assistants (pose guide, common mistakes, muscles, beginner routines); later a "check these angles" tool that receives numbers, never video | A distribution channel, not the product; keeps the privacy-first design |
| Also | Own-video upload with safety checks; rep counting; other voice languages | From earlier reviews |
