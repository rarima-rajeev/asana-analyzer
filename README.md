# Asana Analyzer

"Am I doing this pose correctly?" A small AI product demo: video in → body points (MediaPipe Pose, on device) → simple angle rules → one spoken tip (Gemini writes it, the browser speaks it).

## Run locally
```bash
npm install
npm run dev
```
Needs `GEMINI_API_KEY` in `.env.local` (without it, ready-made tips are used).

## Make the sample videos (costs money: ~$0.51 per 5-second clip)
```bash
.venv/bin/python scripts/make_videos.py triangle-mistake
```

## Re-run the eval
Open the site in dev mode, then in the browser console run `await __runEval()` and save the output to `data/eval.json`.
