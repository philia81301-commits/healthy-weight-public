# -*- coding: utf-8 -*-
"""
首頁開場情境短片：「天天走路，體重還是不動？」（1080×1920 直式、6 秒、30fps、無聲、字幕燒進畫面）

畫面：design/intro-video/ 的 AI 插圖（gpt-image-2 high）＋緩慢推近；字卡用程式疊上（AI 不畫字）。
字卡規則：結語只用跨章固定句「一杯全糖手搖飲的熱量，快走一小時都消耗不完」（content/index.md 內容鐵律），不新增說法。
相依：Pillow、imageio-ffmpeg（內附 ffmpeg 執行檔）

用法：
    python tools/build_intro_video.py            # 輸出 mp4＋封面圖
    python tools/build_intro_video.py --preview  # 只輸出 4 個時間點的畫面 PNG 供檢查
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "design" / "intro-video" / "intro-walk-hq_20261125_093733_1.png"
OUT_DIR = ROOT / "design" / "intro-video"
OUT_MP4 = OUT_DIR / "intro-walk.mp4"          # 英文檔名，供網站引用
OUT_POSTER = OUT_DIR / "intro-walk-poster.jpg"

W, H, FPS, DUR = 1080, 1920, 30, 6.0
FONT_B = "C:/Windows/Fonts/msjhbd.ttc"
INK = (33, 40, 31)
FLAG = (200, 45, 27)
DIET = (194, 98, 10)
WHITE = (255, 255, 255)

# 時間軸（秒）
Q_IN, Q_OUT = 0.25, 3.0          # 上方提問字卡
A_IN = 2.9                       # 下方結語字卡進場（停到片尾）
ZOOM_FROM, ZOOM_TO = 1.0, 1.10   # 推近幅度


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def font(size):
    return ImageFont.truetype(FONT_B, size)


def base_frame(img, t):
    """把插圖放大到填滿 1080×1920，隨時間緩慢推近（以人物略偏下為中心）。"""
    z = ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * (t / DUR)
    s = max(W / img.width, H / img.height) * z
    rw, rh = int(img.width * s), int(img.height * s)
    big = img.resize((rw, rh), Image.LANCZOS)
    cx, cy = rw * 0.47, rh * 0.52
    left = int(min(max(cx - W / 2, 0), rw - W))
    top = int(min(max(cy - H / 2, 0), rh - H))
    return big.crop((left, top, left + W, top + H)).convert("RGBA")


def text_layer(lines, size, y, alpha, rise):
    """置中多行字卡，白色柔光底保證可讀；lines = [(文字, 顏色), ...]"""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(size)
    gap = int(size * 0.32)
    yy = y + rise
    boxes = []
    for txt, col in lines:
        bw = d.textlength(txt, font=f)
        boxes.append((txt, col, (W - bw) / 2, yy))
        yy += size + gap
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for txt, _, x, ty in boxes:
        gd.text((x, ty), txt, font=f, fill=(255, 255, 255, 235), stroke_width=int(size * 0.16), stroke_fill=(255, 255, 255, 235))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    layer = Image.alpha_composite(layer, glow)
    d = ImageDraw.Draw(layer)
    for txt, col, x, ty in boxes:
        d.text((x, ty), txt, font=f, fill=col + (255,))
    if alpha < 1:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer.putalpha(a)
    return layer


def card_layer(alpha, rise):
    """下方結語卡：白色圓角卡片＋跨章固定句＋章節導引。"""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, x1 = 70, W - 70
    y0 = 1460 + rise
    y1 = y0 + 380
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0, y0 + 14, x1, y1 + 14), 42, fill=(0, 0, 0, 70))
    layer = Image.alpha_composite(layer, sh.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x0, y0, x1, y1), 42, fill=(255, 255, 255, 246))
    d.rounded_rectangle((x0, y0, x1, y0 + 16), 8, fill=DIET + (255,))
    f1, f2, f3 = font(62), font(74), font(40)
    d.text((W / 2, y0 + 92), "一杯全糖手搖飲的熱量，", font=f1, fill=INK + (255,), anchor="mm")
    d.text((W / 2, y0 + 190), "快走一小時都消耗不完", font=f2, fill=FLAG + (255,), anchor="mm")
    d.text((W / 2, y0 + 300), "先戒喝的熱量  →  第④章：吃", font=f3, fill=DIET + (255,), anchor="mm")
    if alpha < 1:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer.putalpha(a)
    return layer


def render(t, img):
    fr = base_frame(img, t)
    # 提問字卡：淡入＋上浮，Q_OUT 前後淡出
    qa = ease((t - Q_IN) / 0.5) * (1 - ease((t - Q_OUT) / 0.4))
    if qa > 0.01:
        rise = int(30 * (1 - ease((t - Q_IN) / 0.5)))
        fr = Image.alpha_composite(fr, text_layer([("天天走路，", INK), ("體重還是不動？", FLAG)], 104, 190, qa, rise))
    # 結語卡：由下滑入
    k = ease((t - A_IN) / 0.55)
    if k > 0.01:
        fr = Image.alpha_composite(fr, card_layer(k, int(80 * (1 - k))))
    return fr.convert("RGB")


def main():
    img = Image.open(SRC).convert("RGB")
    if "--preview" in sys.argv:
        for t in (1.5, 3.0, 3.6, 5.9):
            render(t, img).save(OUT_DIR / f"_preview_{t:.1f}s.png")
        print("preview saved")
        return
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT_MP4)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(DUR * FPS)
    for i in range(n):
        p.stdin.write(render(i / FPS, img).tobytes())
    p.stdin.close()
    p.wait()
    # 封面：結語卡完整出現的畫面（不能自動播放時也看得到重點）
    render(5.9, img).save(OUT_POSTER, quality=86)
    print(f"ok: {OUT_MP4} ({OUT_MP4.stat().st_size // 1024} KB), poster {OUT_POSTER.name}")


if __name__ == "__main__":
    main()
