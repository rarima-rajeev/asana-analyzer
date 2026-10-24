"""Make the 10 sample clips with Gemini Omni Flash.

Usage:  .venv/bin/python scripts/make_videos.py mountain-correct [more ids...]
Saves public/videos/<id>.mp4 and scripts/video_log.json (cost info, no key).
"""
import base64, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "gemini-omni-1.1-flash"
URL = "https://generativelanguage.googleapis.com/v1beta/interactions"

SHARED = (
    " One adult, fully clothed in loose, plain, solid-color yoga clothes (long pants, t-shirt)."
    " Plain light-grey studio wall, plain floor, soft even light. Whole body in frame, head to feet,"
    " static camera at hip height. The person moves into the pose and holds it still. About 5 seconds."
    " No text, logos, brands or mirrors. Calm and neutral, nothing revealing. No dialogue, no music."
)

PROMPTS = {
    "mountain-correct": "Front view. A person stands upright in yoga mountain pose: feet together, arms by the sides, shoulders level, body perfectly straight.",
    "mountain-mistake": "Front view. A person stands in mountain pose but leans clearly to their right side, so the shoulders are tilted and the body is not straight.",
    "palmtree-correct": "Side view. A person in palm tree pose: standing tall on tiptoes with both heels lifted high, fingers interlocked with palms turned up, both arms stretched straight up overhead, elbows locked, body in one straight line.",
    "palmtree-mistake": "Side view. A person in palm tree pose standing on tiptoes with heels lifted and fingers interlocked above the head, but the elbows are clearly bent, so the hands rest just above the head instead of reaching straight up.",
    "warrior2-correct": "Front view. A person in warrior two pose: wide stance, front knee bent to a right angle over the ankle, back leg straight, arms stretched out level at shoulder height.",
    "warrior2-mistake": "Front view. A person in warrior two pose with a wide stance and arms out level, but the front knee is only slightly bent, almost straight.",
    "chair-correct": "Side view. A person in chair pose: feet together, knees deeply bent as if sitting on a chair, hips back, arms raised overhead.",
    "chair-mistake": "Side view. A person in chair pose with arms raised overhead but knees only slightly bent, standing almost straight.",
    "triangle-correct": "Front view. A person in triangle pose: wide stance, both legs straight, leaning sideways with the lower hand at the shin and the upper arm pointing straight up.",
    "triangle-mistake": "Front view. A person in triangle pose with a wide stance and arms in one vertical line, but the front knee is clearly bent.",
}


def api_key():
    for line in open(os.path.join(ROOT, ".env.local")):
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("GEMINI_API_KEY missing")


def strip_data(obj):
    """Copy of the response without the big base64 video, for the log."""
    if isinstance(obj, dict):
        return {k: ("<base64>" if k == "data" else strip_data(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [strip_data(v) for v in obj]
    return obj


def find_video(obj):
    if isinstance(obj, dict):
        if obj.get("type") == "video" and obj.get("data"):
            return obj["data"]
        for v in obj.values():
            found = find_video(v)
            if found:
                return found
    if isinstance(obj, list):
        for v in obj:
            found = find_video(v)
            if found:
                return found
    return None


def make(clip_id, key):
    body = {
        "model": MODEL,
        "input": PROMPTS[clip_id] + SHARED,
        "response_format": {"type": "video", "aspect_ratio": "16:9", "resolution": "720p"},
    }
    req = urllib.request.Request(
        URL, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        print(clip_id, "HTTP", e.code, e.read().decode()[:800])
        return None
    video = find_video(resp)
    out = os.path.join(ROOT, "public", "videos", f"{clip_id}.mp4")
    if video:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "wb").write(base64.b64decode(video))
    meta = strip_data(resp)
    print(clip_id, "saved" if video else "NO VIDEO", f"{time.time()-start:.0f}s")
    print(json.dumps(meta, indent=1)[:1500])
    return {"id": clip_id, "seconds_waited": round(time.time() - start), "response": meta}


if __name__ == "__main__":
    key = api_key()
    log_path = os.path.join(ROOT, "scripts", "video_log.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for cid in sys.argv[1:]:
        entry = make(cid, key)
        if entry:
            log.append(entry)
            json.dump(log, open(log_path, "w"), indent=1)
