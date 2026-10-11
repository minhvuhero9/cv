#!/usr/bin/env bash
# Promo assembly: storyboard JSON + per-format capture (raw.mp4 + timeline.json) -> final MP4s.
# Usage: assemble.sh STORYBOARD.json [OUTDIR]
#   expects OUTDIR/raw-<fmt>/{raw.mp4,timeline.json} from tools/capture.mjs (one per format).
# Produces OUTDIR/<slug>_<fmt>.mp4 (h264 crf 20 + aac 128k, 30 fps), cards/, poster.png, contact.png.
# Free/local only: ffmpeg drawtext/xfade + an ffmpeg-synthesised jingle (aevalsrc), no external music.
set -euo pipefail
SB=$(realpath "$1")
SLUG=$(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["slug"])' "$SB")
OUTDIR=$(realpath -m "${2:-/home/user/cv/promo/out/$SLUG}")
TOOLS=$(dirname "$(realpath "$0")")
exec python3 -I - "$SB" "$OUTDIR" "$TOOLS" <<'PY'
import json, os, subprocess, sys, shutil
sb_path, out, tools = sys.argv[1:4]
sb = json.load(open(sb_path))
slug, XF = sb["slug"], float(sb.get("xfade", 0.25))
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
if not os.path.exists(FONT): FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def run(*a): subprocess.run(a, check=True)
def ff(*a): run("ffmpeg", "-v", "error", "-y", *a)
shots = sb["shots"]
total = sum(s["dur"] for s in shots)

def music(path, total, sfx_times):
    # 120 bpm bouncy jingle: plucky square-ish lead on 8ths + bass on beats; rising "magic" sweep at sfx_times.
    lead = [72,76,79,76, 74,77,81,77, 72,76,79,84, 83,79,76,74]   # MIDI, one per 8th note (2 bars loop)
    bass = [48,48,53,53, 55,55,48,43]                              # one per beat (quarter)
    def sel(seq, idx):  # nested if() lookup
        e = "0"
        for i, n in reversed(list(enumerate(seq))):
            f = 440 * 2 ** ((n - 69) / 12)
            e = f"if(eq({idx},{i}),{f:.3f},{e})"
        return e
    li = f"mod(floor(t*4),{len(lead)})"; bi = f"mod(floor(t*2),{len(bass)})"
    lf, bf = sel(lead, li), sel(bass, bi)
    env_l = "exp(-7*mod(t,0.25))"; env_b = "exp(-4*mod(t,0.5))"
    expr = (f"0.16*{env_l}*(sin(2*PI*({lf})*t)+0.3*sin(6*PI*({lf})*t))"
            f"+0.22*{env_b}*sin(2*PI*({bf})*t)"
            f"+0.05*exp(-40*mod(t,0.5))*sin(2*PI*90*t)")            # soft kick
    for ts in sfx_times:  # 0.9 s upward chirp
        expr += f"+if(between(t,{ts:.2f},{ts+0.9:.2f}),0.12*sin(2*PI*(500*(t-{ts:.2f})+900*(t-{ts:.2f})^2))*(1-(t-{ts:.2f})/0.9),0)"
    fade_st = max(0, total - 1.0)
    ff("-f", "lavfi", "-i", f"aevalsrc='{expr}':s=44100:d={total:.3f}",
       "-af", f"afade=t=in:d=0.05,afade=t=out:st={fade_st:.2f}:d=1.0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100",
       "-ac", "2", "-c:a", "pcm_s16le", path)

def esc_expr(s): return s.replace(",", "\\,")

contact_frames = []
for fmt in sb["formats"]:
    name, W, H = fmt["name"], fmt["w"], fmt["h"]
    portrait = H > W
    raw = os.path.join(out, f"raw-{name}")
    tl = json.load(open(os.path.join(raw, "timeline.json")))
    marks = {}
    for m in tl["marks"]: marks.setdefault(m["label"], m["t"])
    src = tl["video"]; srcdur = tl["duration"]
    work = os.path.join(out, f"work-{name}"); cards = os.path.join(out, "cards")
    shutil.rmtree(work, ignore_errors=True); os.makedirs(work); os.makedirs(cards, exist_ok=True)
    # hero crops of the stage for cards (portrait: middle of the screen; landscape: centre mirror)
    crop = "1080:1060:0:400" if portrait else "900:660:510:140"
    segs, sfx = [], []
    tcur = 0.0
    for i, s in enumerate(shots):
        last = i == len(shots) - 1
        L = s["dur"] + (0 if last else XF)
        seg = os.path.join(work, f"{i:02d}-{s['id']}.mp4")
        cap = s.get("caption")
        vf = []
        if s["type"] == "card":
            hero = os.path.join(work, f"hero-{s['id']}.png")
            h = s.get("hero")
            if h and h["mark"] in marks:
                ff("-ss", f"{marks[h['mark']] + h.get('offset', 0):.3f}", "-i", src, "-frames:v", "1", "-vf", f"crop={crop}", hero)
            card = os.path.join(cards, f"{s['id']}_{name}.png")
            run("node", os.path.join(tools, "render-cards.mjs"), "--kind", s["card"], "--w", str(W), "--h", str(H), "--out", card,
                "--title", s["text"], "--sub", s.get("sub", ""), "--badge", s.get("badge", ""), *(["--hero", hero] if os.path.exists(hero) else []))
            # gentle push-in so the card is not a dead still
            ff("-loop", "1", "-framerate", "30", "-t", f"{L:.3f}", "-i", card, "-vf",
               f"scale=w='trunc({W}*(1+0.04*t/{L:.3f})/2)*2':h=-2:eval=frame,crop={W}:{H},fps=30,format=yuv420p",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-an", seg)
        else:
            start = marks.get(s["from"], 0) + s.get("offset", 0)
            if "to" in s and s["to"] in marks:  # anchor the segment end to a mark, but never start before `from`
                start = max(start, marks[s["to"]] + s.get("to_offset", 0) - L)
            start = max(0.0, start)
            avail = srcdur - start
            if "transform" in marks and start <= marks["transform"] < start + s["dur"]:
                sfx.append(tcur + (marks["transform"] - start))
            vf.append(f"trim=start={start:.3f}:duration={min(L, avail):.3f},setpts=PTS-STARTPTS")
            if avail < L: vf.append(f"tpad=stop_mode=clone:stop_duration={L - avail + 0.1:.3f}")
            vf.append(f"scale={W}:{H}:flags=lanczos,fps=30")
            if cap:
                tf = os.path.join(work, f"cap-{s['id']}.txt")
                open(tf, "w").write(cap)
                fs = round(min(W, H) * (0.06 if portrait else 0.062))
                y = {"low": "h*0.80" if portrait else "h*0.775", "top": "h*0.045" if portrait else "h*0.04", "mid": "h*0.5"}[s.get("pos", "low")]
                a = f"if(lt(t,0.15),0,min(1,(t-0.15)/0.2))"
                vf.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontsize={fs}:fontcolor=white:borderw=3:bordercolor=0x5a1b0e:"
                          f"box=1:boxcolor=0xd93a2b@0.94:boxborderw={round(fs*0.45)}:x=(w-tw)/2:y={y}:alpha='{a}'")
            vf.append("format=yuv420p")
            ff("-i", src, "-vf", ",".join(vf), "-t", f"{L:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-an", seg)
        segs.append((seg, L))
        tcur += s["dur"]
    # xfade chain
    inputs, fc, prev, acc = [], [], "[0:v]", 0.0
    for seg, _ in segs: inputs += ["-i", seg]
    for i in range(1, len(segs)):
        acc += shots[i - 1]["dur"]
        lab = f"[x{i}]" if i < len(segs) - 1 else "[v]"
        fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={acc:.3f}{lab}")
        prev = lab
    wav = os.path.join(work, "music.wav")
    music(wav, total, sfx)
    final = os.path.join(out, f"{slug}_{name}.mp4")
    ff(*inputs, "-i", wav, "-filter_complex", ";".join(fc),
       "-map", "[v]", "-map", f"{len(segs)}:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
       "-r", "30", "-c:a", "aac", "-b:a", "128k", "-t", f"{total:.3f}", "-movflags", "+faststart", final)
    print("wrote", final)
    if portrait:
        ff("-ss", f"{shots[0]['dur'] + shots[1]['dur'] + shots[2]['dur'] - 0.6:.2f}", "-i", final, "-frames:v", "1", os.path.join(out, "poster.png"))
    # contact sheet: 8 evenly spaced frames
    cs = os.path.join(work, "contact"); os.makedirs(cs, exist_ok=True)
    ts = [0.15 + k * (total - 0.3) / 7 for k in range(8)]
    for k, t in enumerate(ts):
        ff("-ss", f"{t:.2f}", "-i", final, "-frames:v", "1", "-vf", f"scale={'270:480' if portrait else '480:270'}", os.path.join(cs, f"{k}.png"))
    contact_frames.append((name, portrait, [os.path.join(cs, f"{k}.png") for k in range(8)], ts))

from PIL import Image, ImageDraw, ImageFont
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
rows = []
for name, portrait, files, ts in contact_frames:
    ims = [Image.open(f) for f in files]
    w, h = ims[0].size
    cols = 8 if portrait else 4
    rr = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8) + 8, rr * (h + 34) + 8), "#222")
    d = ImageDraw.Draw(sheet)
    for k, (im, t) in enumerate(zip(ims, ts)):
        x, y = 8 + (k % cols) * (w + 8), 8 + (k // cols) * (h + 34)
        sheet.paste(im, (x, y + 26)); d.text((x, y + 2), f"{name}  t={t:.1f}s", fill="white", font=font)
    rows.append(sheet)
W = max(r.width for r in rows); Hs = sum(r.height for r in rows)
c = Image.new("RGB", (W, Hs), "#222"); y = 0
for r in rows: c.paste(r, (0, y)); y += r.height
c.save(os.path.join(out, "contact.png")); print("wrote", os.path.join(out, "contact.png"))
PY
