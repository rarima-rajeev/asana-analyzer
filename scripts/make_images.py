"""Make the page illustrations with Gemini's image model, saved as compressed webp.

Usage:  .venv/bin/python scripts/make_images.py hero device
Saves public/images/<name>.webp
"""
import base64, json, os, subprocess, sys, tempfile, urllib.request

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "gemini-3.1-flash-image"

STYLE = (
    " Flat, modern editorial illustration with soft grain, calm and minimal. Palette: deep plum (#7b2869),"
    " soft blush pink, warm off-white and a touch of warm wood. Plain background with lots of empty space."
    " No text, letters, numbers, logos or brands. Calm and neutral, nothing revealing."
)

PROMPTS = {
    "hero": (
        "One adult doing yoga warrior two pose, seen from the front: wide stance, front knee bent over the ankle,"
        " back leg straight, arms stretched out level. Fully clothed in loose, plain, long yoga pants and a"
        " loose t-shirt. A thin, glowing stick-figure skeleton with small dots at the joints is drawn lightly over"
        " the body, as if a computer is tracing the pose. Person centered, whole body in frame.",
        "4:3",
    ),
    "device": (
        "A smartphone propped up on a yoga mat, its screen showing a simple stick figure made of lines and dots"
        " doing a yoga pose. A small speech bubble icon (no words inside) comes from the phone, suggesting it speaks"
        " a tip. No person in the scene.",
        "4:3",
    ),
}


def api_key():
    for line in open(os.path.join(ROOT, ".env.local")):
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("GEMINI_API_KEY missing")


def make(name, key):
    prompt, aspect = PROMPTS[name]
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt + STYLE}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        print(name, "HTTP", e.code, e.read().decode()[:500])
        return
    parts = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    img = next((p["inlineData"] for p in parts if "inlineData" in p), None)
    if not img:
        print(name, "no image", json.dumps(resp)[:500])
        return
    with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as tmp:
        tmp.write(base64.b64decode(img["data"]))
    out = os.path.join(ROOT, "public", "images", f"{name}.webp")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-y", "-i", tmp.name,
         "-vf", "scale='min(1200,iw)':-2", "-c:v", "libwebp", "-quality", "78", out],
        check=True,
    )
    os.unlink(tmp.name)
    print(name, "saved", out, f"{os.path.getsize(out)//1024} KB", "tokens:", resp.get("usageMetadata", {}).get("candidatesTokenCount"))


if __name__ == "__main__":
    key = api_key()
    for n in sys.argv[1:]:
        make(n, key)
