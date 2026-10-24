"""Make the soft page background image with Gemini's image model.

Usage:  .venv/bin/python scripts/make_background.py
Saves public/bg-yoga.jpg
"""
import base64, json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "gemini-3.1-flash-image"
PROMPT = (
    "A calm, airy photograph of a small group of four adults of different ages sitting cross-legged on yoga mats"
    " in a bright, minimal studio with large windows and soft morning light, eyes closed, hands resting on knees."
    " Everyone is fully clothed in loose, plain, solid-color yoga clothes (long pants, t-shirts), in soft muted"
    " earthy colors. Wide shot, people small in the frame with lots of empty space, gentle soft focus, light and"
    " low-contrast. No text, logos, brands or mirrors. Calm and neutral, nothing revealing."
)


def api_key():
    for line in open(os.path.join(ROOT, ".env.local")):
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("GEMINI_API_KEY missing")


body = {
    "contents": [{"role": "user", "parts": [{"text": PROMPT}]}],
    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}},
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
    data=json.dumps(body).encode(), method="POST",
    headers={"Content-Type": "application/json", "x-goog-api-key": api_key()},
)
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        resp = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit(f"HTTP {e.code} {e.read().decode()[:800]}")

parts = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [])
img = next((p["inlineData"] for p in parts if "inlineData" in p), None)
if not img:
    sys.exit(f"No image returned: {json.dumps(resp)[:800]}")
ext = "png" if "png" in img.get("mimeType", "") else "jpg"
out = os.path.join(ROOT, "public", f"bg-yoga.{ext}")
open(out, "wb").write(base64.b64decode(img["data"]))
print("saved", out, img.get("mimeType"), "usage:", resp.get("usageMetadata"))
