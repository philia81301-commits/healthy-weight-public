# -*- coding: utf-8 -*-
"""
把 design/exercise-cards/ 六張居家運動圖卡合成一支衛教影片（1920×1080、30fps、含旁白與字幕）。

規則：
- 一個動作固定 10 秒（同一動作多視角的，10 秒內平均切換視角）
- 旁白與字幕只用圖卡上已審定的字句，不新增內容
- 相依：Pillow、edge-tts（免費語音）、imageio-ffmpeg（內附 ffmpeg 執行檔）

用法：
    python tools/build_exercise_video.py            # 完整輸出
    python tools/build_exercise_video.py --preview  # 只輸出各段首幀 PNG 供檢查，不合成影片
"""
import asyncio
import io
import math
import os
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CARD_DIR = ROOT / "design" / "exercise-cards"
OUT_DIR = ROOT / "design" / "exercise-video"
CACHE = Path(os.environ.get("EXV_CACHE", OUT_DIR / "_cache"))
OUT_MP4 = OUT_DIR / "exercise-cards-10s.mp4"   # 英文檔名，供網站直接引用

W, H = 1920, 1080
FPS = 30
MOVE_SEC = 10.0          # 每個動作固定秒數
XFADE = 0.5              # 卡片之間淡入淡出
PAN = 0.7                # 視角推近／切換的動畫秒數
BG = (243, 248, 248)
TEAL = (15, 76, 92)
ORANGE = (194, 98, 10)
RED = (200, 45, 27)
WHITE = (255, 255, 255)

FONT_B = "C:/Windows/Fonts/msjhbd.ttc"
FONT_R = "C:/Windows/Fonts/msjh.ttc"
VOICE = "zh-TW-HsiaoChenNeural"
RATE = "-5%"

# ---------- 內容（字句全部取自圖卡） ----------
CARDS = [
    dict(
        file="core4moves-labeled.png",
        intro="第一張，每天十分鐘核心菜單。四個動作各三十秒、休息三十秒、輪兩圈。",
        intro_sub="每天 10 分鐘核心菜單：四個動作各 30 秒・休息 30 秒・輪 2 圈",
        moves=[
            dict(name="橋式", views=[(20, 110, 760, 600)],
                 say="橋式。躺著、膝蓋彎，屁股抬起夾緊。進階可以做單腳橋式。",
                 sub="橋式：躺著、膝蓋彎，屁股抬起夾緊（進階：單腳橋式）"),
            dict(name="死蟲式", views=[(776, 110, 1516, 600)],
                 say="死蟲式。對側手腳慢慢伸直再收回；腰貼地、不拱起。",
                 sub="死蟲式：對側手腳慢慢伸直再收回；腰貼地、不拱起"),
            dict(name="鳥狗式", views=[(20, 620, 760, 1105)],
                 say="鳥狗式。四足跪姿、對側手腳伸直；肚子收緊、身體不晃。",
                 sub="鳥狗式：四足跪姿、對側手腳伸直；肚子收緊、身體不晃"),
            dict(name="棒式", views=[(776, 620, 1516, 1105)],
                 say="棒式。手肘撐地、身體一直線。做不來，先用膝蓋著地版。",
                 sub="棒式：手肘撐地、身體一直線（做不來先用膝蓋著地版）"),
        ],
        outro="做的時候正常呼吸、不要憋氣；腰會痛就停下來，回診時告訴醫師。",
        outro_sub="做的時候正常呼吸、不要憋氣；腰會痛就停下來，回診時告訴醫師。",
    ),
    dict(
        file="squat-labeled.png",
        intro="第二張，深蹲。像坐椅子、屁股往後。",
        intro_sub="深蹲：像坐椅子、屁股往後",
        moves=[
            dict(name="深蹲", views=[(20, 120, 752, 1090), (782, 120, 1516, 1090)],
                 say="深蹲。像坐椅子、屁股往後。先看正面，再看側面。",
                 sub="深蹲：像坐椅子、屁股往後（正面 → 側面）"),
        ],
    ),
    dict(
        file="splitsquat-labeled.png",
        intro="第三張，分腿蹲加靠牆深蹲。膝蓋都是九十度。",
        intro_sub="分腿蹲＋靠牆深蹲：膝蓋 90 度",
        moves=[
            dict(name="分腿蹲", views=[(15, 65, 525, 812), (540, 65, 1055, 812)],
                 say="分腿蹲。膝蓋九十度。正面，側面。",
                 sub="分腿蹲：膝蓋 90 度（正面 → 側面）"),
            dict(name="靠牆深蹲", views=[(1075, 65, 1585, 812)],
                 say="靠牆深蹲。背靠著牆，膝蓋九十度。",
                 sub="靠牆深蹲：膝蓋 90 度（側面）"),
        ],
    ),
    dict(
        file="march-labeled.png",
        intro="第四張，原地抬膝。膝蓋抬到九十度。",
        intro_sub="原地抬膝：膝蓋成 90 度",
        moves=[
            dict(name="原地抬膝",
                 views=[(15, 65, 525, 812), (540, 65, 1055, 812), (1075, 65, 1585, 812)],
                 say="原地抬膝。膝蓋抬到九十度。正面，側面，再加轉身。",
                 sub="原地抬膝：膝蓋成 90 度（正面 → 側面 → 轉身）"),
        ],
    ),
    dict(
        file="jjacks-labeled.png",
        intro="第五張，原地開合跳。",
        intro_sub="原地開合跳",
        moves=[
            dict(name="原地開合跳",
                 views=[(15, 65, 525, 812), (540, 65, 1055, 812), (1075, 65, 1585, 812)],
                 say="原地開合跳。合，腳併攏、手放下。開，腳張開、手舉高。再加彎腰轉身，左手碰右腳。",
                 sub="合（腳併攏、手放下）→ 開（腳張開、手舉高）→ 彎腰轉身（左手碰右腳）"),
        ],
    ),
    dict(
        file="kbswing-labeled.png",
        intro="第六張，甩壺鈴。這是進階動作，需要器材。",
        intro_sub="甩壺鈴（進階、需器材）",
        moves=[
            dict(name="甩壺鈴",
                 views=[(15, 65, 525, 812), (540, 65, 1055, 812), (1075, 65, 1585, 812)],
                 say="甩壺鈴。正面。側面，蹲九十度。甩出平舉。",
                 sub="甩壺鈴：正面 → 側面（蹲 90 度）→ 甩出平舉"),
        ],
    ),
]

TITLE_SAY = "居家運動圖卡，六張圖卡、十個動作，每個動作十秒，跟著做就對了。前三張是肌力，每週兩次；後三張是讓心跳加快的原地運動，湊你的每週一百五十分鐘。"
TITLE_SUB = "前三張肌力（每週 2 次）・後三張原地有氧（湊每週 150 分鐘）"
END_SAY = "共同原則：正常呼吸、不要憋氣；關節會痛就停下來，回診時告訴醫師。運動中如果胸痛、明顯喘不過氣、頭暈，要停止並就醫。"
END_SUB = "正常呼吸、不要憋氣；關節會痛就停下來，回診時告訴醫師"

TOTAL_MOVES = sum(len(c["moves"]) for c in CARDS)


# ---------- 工具 ----------
def font(path, size):
    return ImageFont.truetype(path, size)


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerp_rect(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


def pad_to_169(im):
    """把圖卡置中貼到留有大邊的畫布（背景色），回傳畫布與圖卡偏移。"""
    w, h = im.size
    pad = int(h * 0.6)
    cw, ch = w + 2 * pad, h + 2 * pad
    canvas = Image.new("RGB", (cw, ch), BG)
    ox, oy = pad, pad
    canvas.paste(im, (ox, oy))
    return canvas, ox, oy


BAR_H = 150              # 字幕列高度
TOP_FRAC = (H - BAR_H - 24) / H   # 主體可用的畫面高度比例


def rect_169(box, canvas_size, margin=0.05):
    """回傳一個 16:9 裁切框，使 box（含邊距）落在字幕列以上的區域內並置中。"""
    cw, ch = canvas_size
    x0, y0, x1, y1 = box
    bw, bh = (x1 - x0) * (1 + margin * 2), (y1 - y0) * (1 + margin * 2)
    rh = max(bh / TOP_FRAC, bw * 9 / 16)
    rw = rh * 16 / 9
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx0 = cx - rw / 2
    ry0 = cy - (rh * TOP_FRAC) / 2
    rx0 = min(max(0, rx0), cw - rw)
    ry0 = min(max(0, ry0), ch - rh)
    return (rx0, ry0, rx0 + rw, ry0 + rh)


def wrap(text, fnt, max_w, draw):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=fnt) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


_F_SUB = None
_F_TAG = None


def overlay(frame, sub, tag=None, progress=None, color=TEAL):
    """字幕列（底部）＋左側小標＋進度條。"""
    global _F_SUB, _F_TAG
    if _F_SUB is None:
        _F_SUB = font(FONT_B, 44)
        _F_TAG = font(FONT_R, 30)
    bar_h = BAR_H
    ov = Image.new("RGBA", (W, bar_h), color + (222,))
    d = ImageDraw.Draw(ov)
    left = 380 if tag else 60
    area = W - left - 60
    lines = wrap(sub, _F_SUB, area, d)
    lh = 56
    y = (bar_h - lh * len(lines)) // 2 + 2
    for ln in lines:
        tw = d.textlength(ln, font=_F_SUB)
        d.text((left + (area - tw) / 2, y), ln, font=_F_SUB, fill=WHITE)
        y += lh
    if tag:
        d.text((40, 40), tag, font=_F_TAG, fill=(255, 255, 255, 230))
        d.text((40, 84), f"每個動作 {int(MOVE_SEC)} 秒", font=_F_TAG, fill=(255, 255, 255, 170))
    if progress is not None:
        d.rectangle((0, 0, W, 10), fill=(255, 255, 255, 60))
        d.rectangle((0, 0, int(W * progress), 10), fill=ORANGE + (255,))
    frame.paste(ov, (0, H - bar_h), ov)
    return frame


def render_view(canvas, rect):
    x0, y0, x1, y1 = rect
    crop = canvas.crop((int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))))
    return crop.resize((W, H), Image.LANCZOS if crop.width < W * 1.5 else Image.BILINEAR)


def title_frame(thumbs):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 28, H), fill=TEAL)
    d.text((110, 150), "居家運動圖卡", font=font(FONT_B, 120), fill=TEAL)
    d.text((116, 320), "6 張圖卡・10 個動作・每個動作 10 秒", font=font(FONT_B, 54), fill=ORANGE)
    f = font(FONT_R, 40)
    d.text((116, 430), "前三張：肌力，每週 2 次", font=f, fill=TEAL)
    d.text((116, 490), "後三張：讓心跳加快的原地運動，湊每週 150 分鐘", font=f, fill=TEAL)
    d.text((116, 600), "跟著做就對了。正常呼吸、不要憋氣。", font=font(FONT_B, 40), fill=TEAL)
    # 右側六張縮圖
    tw, th, gap = 330, 220, 22
    x0, y0 = W - 2 * tw - gap - 80, 150
    for i, t in enumerate(thumbs):
        r, c = divmod(i, 2)
        x, y = x0 + c * (tw + gap), y0 + r * (th + gap)
        d.rounded_rectangle((x - 6, y - 6, x + tw + 6, y + th + 6), 18, fill=WHITE, outline=(190, 215, 215), width=2)
        tt = t.copy()
        tt.thumbnail((tw, th))
        im.paste(tt, (x + (tw - tt.width) // 2, y + (th - tt.height) // 2))
    return im


def end_frame():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 28, H), fill=TEAL)
    d.text((110, 120), "共同原則", font=font(FONT_B, 90), fill=TEAL)
    f = font(FONT_B, 54)
    d.text((116, 270), "正常呼吸、不要憋氣", font=f, fill=TEAL)
    d.text((116, 350), "關節會痛就停下來，回診時告訴醫師", font=f, fill=TEAL)
    d.rounded_rectangle((110, 480, W - 110, 700), 28, fill=(253, 236, 232), outline=RED, width=5)
    d.text((150, 505), "紅旗：運動中胸痛、明顯喘不過氣、頭暈", font=font(FONT_B, 56), fill=RED)
    d.text((150, 590), "停止並就醫", font=font(FONT_B, 64), fill=RED)
    d.text((116, 800), "完整內容：philia81301-commits.github.io/healthy-weight-public/move.html",
           font=font(FONT_R, 34), fill=(90, 110, 115))
    return im


# ---------- 語音 ----------
FFMPEG = None


def ffmpeg_exe():
    global FFMPEG
    if FFMPEG is None:
        import imageio_ffmpeg
        FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    return FFMPEG


async def _tts(text, mp3):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(mp3))


def tts_wav(key, text):
    """回傳 (wav_path, seconds)。快取在 CACHE。"""
    CACHE.mkdir(parents=True, exist_ok=True)
    mp3 = CACHE / f"{key}.mp3"
    wav = CACHE / f"{key}.wav"
    txt = CACHE / f"{key}.txt"
    if not (wav.exists() and txt.exists() and txt.read_text(encoding="utf-8") == text):
        asyncio.run(_tts(text, mp3))
        subprocess.run([ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(mp3),
                        "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", str(wav)], check=True)
        txt.write_text(text, encoding="utf-8")
    with wave.open(str(wav), "rb") as w:
        sec = w.getnframes() / w.getframerate()
    return wav, sec


# ---------- 時間軸 ----------
def build_timeline():
    """回傳 segments：每段 dict(kind, dur, say_wav, frames_fn, ...)"""
    segs = []
    cards = []
    for c in CARDS:
        im = Image.open(CARD_DIR / c["file"]).convert("RGB")
        canvas, ox, oy = pad_to_169(im)
        cards.append((im, canvas, ox, oy))

    wav, sec = tts_wav("title", TITLE_SAY)
    segs.append(dict(kind="title", dur=max(sec + 1.0, 6.0), wav=wav, sub=TITLE_SUB))

    move_no = 0
    for ci, c in enumerate(CARDS):
        im, canvas, ox, oy = cards[ci]
        full = rect_169((ox, oy, ox + im.width, oy + im.height), canvas.size, margin=0.02)
        wav, sec = tts_wav(f"c{ci}_intro", c["intro"])
        segs.append(dict(kind="full", card=ci, rect=full, dur=max(sec + 0.8, 4.0), wav=wav,
                         sub=c["intro_sub"], first=True))
        for m in c["moves"]:
            move_no += 1
            wav, sec = tts_wav(f"c{ci}_{m['name']}", m["say"])
            rects = [rect_169((v[0] + ox, v[1] + oy, v[2] + ox, v[3] + oy), canvas.size) for v in m["views"]]
            segs.append(dict(kind="move", card=ci, rects=rects, dur=max(MOVE_SEC, sec + 0.5), wav=wav,
                             sub=m["sub"], tag=f"動作 {move_no}／{TOTAL_MOVES}・{m['name']}"))
        if c.get("outro"):
            wav, sec = tts_wav(f"c{ci}_outro", c["outro"])
            segs.append(dict(kind="full", card=ci, rect=full, dur=max(sec + 0.8, 4.0), wav=wav,
                             sub=c["outro_sub"], first=False))

    wav, sec = tts_wav("end", END_SAY)
    segs.append(dict(kind="end", dur=max(sec + 1.5, 8.0), wav=wav, sub=END_SUB))
    return segs, cards


def seg_frame(seg, cards, t, prev_rect_holder, title_im, end_im):
    """產生某段在時間 t（秒）的畫面。"""
    kind = seg["kind"]
    if kind == "title":
        return overlay(title_im.copy(), seg["sub"])
    if kind == "end":
        return overlay(end_im.copy(), seg["sub"], color=TEAL)
    im, canvas, ox, oy = cards[seg["card"]]
    if kind == "full":
        if seg["first"] or prev_rect_holder[0] is None:
            rect = seg["rect"]
        else:
            rect = lerp_rect(prev_rect_holder[0], seg["rect"], smooth(t / PAN))
        prev_rect_holder[1] = rect
        return overlay(render_view(canvas, rect), seg["sub"])
    # move：多視角在 dur 內平均分配，視角間以 PAN 秒推移
    rects = seg["rects"]
    n = len(rects)
    slot = seg["dur"] / n
    i = min(int(t // slot), n - 1)
    local = t - i * slot
    start_rect = prev_rect_holder[0] if i == 0 else rects[i - 1]
    if start_rect is None:
        start_rect = rects[i]
    rect = lerp_rect(start_rect, rects[i], smooth(local / PAN))
    prev_rect_holder[1] = rect
    return overlay(render_view(canvas, rect), seg["sub"], tag=seg["tag"], progress=t / seg["dur"])


def main(preview=False):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    segs, cards = build_timeline()
    title_im = title_frame([c[0] for c in cards])
    end_im = end_frame()
    total = sum(s["dur"] for s in segs)
    print(f"段數 {len(segs)}，總長 {total:.1f} 秒，動作數 {TOTAL_MOVES}")

    if preview:
        pdir = OUT_DIR / "_preview"
        pdir.mkdir(exist_ok=True)
        for i, s in enumerate(segs):
            holder = [None, None]
            f = seg_frame(s, cards, min(s["dur"] - 0.01, PAN + 0.2), holder, title_im, end_im)
            f.save(pdir / f"{i:02d}_{s['kind']}.png")
        print("預覽幀已輸出：", pdir)
        return

    # 合成主音軌（24 kHz mono s16）：各段語音放在該段起點
    sr = 24000
    total_frames_audio = int(total * sr) + sr
    audio = bytearray(b"\x00\x00" * total_frames_audio)
    t0 = 0.0
    for s in segs:
        with wave.open(str(s["wav"]), "rb") as w:
            data = w.readframes(w.getnframes())
        off = int((t0 + 0.25) * sr) * 2
        audio[off:off + len(data)] = data
        t0 += s["dur"]
    master = CACHE / "master.wav"
    with wave.open(str(master), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(audio))

    cmd = [ffmpeg_exe(), "-y", "-loglevel", "error", "-stats",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
           "-i", str(master),
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(OUT_MP4)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    prev_last = None
    holder = [None, None]  # [上一段結束時的 rect, 本段目前 rect]
    prev_card = None
    xfade_frames = int(XFADE * FPS)
    nframes = 0
    for s in segs:
        card = s.get("card")
        new_card = card != prev_card
        if new_card:
            holder[0] = None
        n = int(round(s["dur"] * FPS))
        for k in range(n):
            t = k / FPS
            f = seg_frame(s, cards, t, holder, title_im, end_im)
            if new_card and prev_last is not None and k < xfade_frames:
                a = smooth((k + 1) / xfade_frames)
                f = Image.blend(prev_last, f, a)
            proc.stdin.write(f.tobytes())
            nframes += 1
        prev_last = f
        holder[0] = holder[1]
        prev_card = card
    proc.stdin.close()
    proc.wait()
    print(f"完成：{OUT_MP4}（{nframes} 幀，{nframes / FPS:.1f} 秒，{OUT_MP4.stat().st_size / 1e6:.1f} MB）")


if __name__ == "__main__":
    main(preview="--preview" in sys.argv)
